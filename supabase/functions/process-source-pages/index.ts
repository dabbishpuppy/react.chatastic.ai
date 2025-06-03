
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

    console.log('🔄 Starting source pages processing batch...');

    // Get pending source pages to process (prioritize older ones)
    const { data: pendingPages, error: fetchError } = await supabaseClient
      .from('source_pages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Process in small batches

    if (fetchError) {
      console.error('❌ Failed to fetch pending pages:', fetchError);
      throw new Error(`Failed to fetch pending pages: ${fetchError.message}`);
    }

    if (!pendingPages || pendingPages.length === 0) {
      console.log('📭 No pending source pages to process');
      
      // Check for stuck pages that might need attention
      const { data: stuckPages, error: stuckError } = await supabaseClient
        .from('source_pages')
        .select('id, url, status, started_at, retry_count')
        .eq('status', 'in_progress')
        .lt('started_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // 10 minutes ago
      
      if (!stuckError && stuckPages && stuckPages.length > 0) {
        console.log(`🚨 Found ${stuckPages.length} stuck pages, resetting to pending...`);
        
        // Reset stuck pages back to pending
        const { error: resetError } = await supabaseClient
          .from('source_pages')
          .update({ 
            status: 'pending',
            started_at: null,
            retry_count: 0
          })
          .in('id', stuckPages.map(p => p.id));
        
        if (resetError) {
          console.error('❌ Failed to reset stuck pages:', resetError);
        } else {
          console.log(`✅ Reset ${stuckPages.length} stuck pages to pending`);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending pages to process',
          processedCount: 0,
          resetStuckCount: stuckPages?.length || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`📋 Found ${pendingPages.length} pending pages to process`);

    // Process each page by calling the child-job-processor
    const results = [];
    
    for (const page of pendingPages) {
      try {
        console.log(`🚀 Processing page: ${page.url} (ID: ${page.id})`);
        
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
          console.error(`❌ Failed to process page ${page.id}:`, processingError);
          
          // Mark as failed with error details
          await supabaseClient
            .from('source_pages')
            .update({
              status: 'failed',
              error_message: processingError.message,
              completed_at: new Date().toISOString(),
              retry_count: (page.retry_count || 0) + 1
            })
            .eq('id', page.id);
          
          results.push({
            pageId: page.id,
            url: page.url,
            success: false,
            error: processingError.message
          });
        } else {
          console.log(`✅ Successfully processed page ${page.id}`);
          results.push({
            pageId: page.id,
            url: page.url,
            success: true,
            result: processingResult
          });
        }
      } catch (error) {
        console.error(`❌ Error processing page ${page.id}:`, error);
        
        // Mark as failed
        await supabaseClient
          .from('source_pages')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
            retry_count: (page.retry_count || 0) + 1
          })
          .eq('id', page.id);
        
        results.push({
          pageId: page.id,
          url: page.url,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`📊 Batch processing complete: ${successCount} successful, ${failedCount} failed`);

    // Trigger parent status aggregation for affected parents
    const parentIds = [...new Set(pendingPages.map(p => p.parent_source_id).filter(Boolean))];
    for (const parentId of parentIds) {
      try {
        await supabaseClient.rpc('aggregate_parent_status', { parent_id: parentId });
        console.log(`🔄 Aggregated status for parent: ${parentId}`);
      } catch (error) {
        console.error(`❌ Failed to aggregate parent ${parentId}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: pendingPages.length,
        successCount,
        failedCount,
        results,
        affectedParents: parentIds.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Source pages processor error:', error);
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
