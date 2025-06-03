
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Starting automatic source pages processing...');

    // Get pending source pages to process (prioritize older ones)
    const { data: pendingPages, error: fetchError } = await supabaseClient
      .from('source_pages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(15); // Process more pages at once for better efficiency

    if (fetchError) {
      console.error('❌ Failed to fetch pending pages:', fetchError);
      throw new Error(`Failed to fetch pending pages: ${fetchError.message}`);
    }

    // Auto-recovery: Check for stuck pages and reset them
    const { data: stuckPages, error: stuckError } = await supabaseClient
      .from('source_pages')
      .select('id, url, status, started_at, retry_count')
      .eq('status', 'in_progress')
      .lt('started_at', new Date(Date.now() - 8 * 60 * 1000).toISOString()); // 8 minutes ago

    if (!stuckError && stuckPages && stuckPages.length > 0) {
      console.log(`🔄 Auto-recovering ${stuckPages.length} stuck pages...`);
      
      // Reset stuck pages back to pending automatically
      const { error: resetError } = await supabaseClient
        .from('source_pages')
        .update({ 
          status: 'pending',
          started_at: null,
          retry_count: 0
        })
        .in('id', stuckPages.map(p => p.id));
      
      if (resetError) {
        console.error('❌ Failed to auto-recover stuck pages:', resetError);
      } else {
        console.log(`✅ Auto-recovered ${stuckPages.length} stuck pages`);
      }
    }

    if (!pendingPages || pendingPages.length === 0) {
      console.log('📭 No pending source pages to process');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending pages to process',
          processedCount: 0,
          autoRecoveredCount: stuckPages?.length || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`📋 Auto-processing ${pendingPages.length} pending pages...`);

    // Process each page automatically
    const results = [];
    
    for (const page of pendingPages) {
      try {
        console.log(`🚀 Auto-processing page: ${page.url} (ID: ${page.id})`);
        
        // Mark as in_progress first
        await supabaseClient
          .from('source_pages')
          .update({ 
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .eq('id', page.id);
        
        // Call the child-job-processor function
        const { data: processingResult, error: processingError } = await supabaseClient
          .functions.invoke('child-job-processor', {
            body: { childJobId: page.id }
          });

        if (processingError) {
          console.error(`❌ Failed to auto-process page ${page.id}:`, processingError);
          
          // Auto-retry logic: mark as failed but increment retry count
          const newRetryCount = (page.retry_count || 0) + 1;
          const shouldRetry = newRetryCount < 3;
          
          await supabaseClient
            .from('source_pages')
            .update({
              status: shouldRetry ? 'pending' : 'failed',
              error_message: processingError.message,
              completed_at: shouldRetry ? null : new Date().toISOString(),
              retry_count: newRetryCount
            })
            .eq('id', page.id);
          
          results.push({
            pageId: page.id,
            url: page.url,
            success: false,
            error: processingError.message,
            autoRetried: shouldRetry
          });
        } else {
          console.log(`✅ Successfully auto-processed page ${page.id}`);
          results.push({
            pageId: page.id,
            url: page.url,
            success: true,
            result: processingResult
          });
        }
      } catch (error) {
        console.error(`❌ Error auto-processing page ${page.id}:`, error);
        
        // Auto-retry logic for exceptions too
        const newRetryCount = (page.retry_count || 0) + 1;
        const shouldRetry = newRetryCount < 3;
        
        await supabaseClient
          .from('source_pages')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            error_message: error.message,
            completed_at: shouldRetry ? null : new Date().toISOString(),
            retry_count: newRetryCount
          })
          .eq('id', page.id);
        
        results.push({
          pageId: page.id,
          url: page.url,
          success: false,
          error: error.message,
          autoRetried: shouldRetry
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const autoRetriedCount = results.filter(r => r.autoRetried).length;

    console.log(`📊 Auto-processing complete: ${successCount} successful, ${failedCount} failed, ${autoRetriedCount} auto-retried`);

    // Auto-trigger parent status aggregation for affected parents
    const parentIds = [...new Set(pendingPages.map(p => p.parent_source_id).filter(Boolean))];
    for (const parentId of parentIds) {
      try {
        await supabaseClient.rpc('aggregate_parent_status', { parent_id: parentId });
        console.log(`🔄 Auto-aggregated status for parent: ${parentId}`);
      } catch (error) {
        console.error(`❌ Failed to auto-aggregate parent ${parentId}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: pendingPages.length,
        successCount,
        failedCount,
        autoRetriedCount,
        autoRecoveredCount: stuckPages?.length || 0,
        results,
        affectedParents: parentIds.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Auto-processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
