import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient } from '../_shared/database-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function autoRecoverStuckPages(supabaseClient: any) {
  const { data: stuckPages, error: stuckError } = await supabaseClient
    .from('source_pages')
    .select('id, url, status, started_at, retry_count')
    .eq('status', 'in_progress')
    .lt('started_at', new Date(Date.now() - 8 * 60 * 1000).toISOString());

  if (!stuckError && stuckPages && stuckPages.length > 0) {
    console.log(`🔄 Auto-recovering ${stuckPages.length} stuck pages...`);
    
    const { error: resetError } = await supabaseClient
      .from('source_pages')
      .update({ 
        status: 'pending',
        started_at: null,
        retry_count: 0,
        error_message: null
      })
      .in('id', stuckPages.map(p => p.id));
    
    if (resetError) {
      console.error('❌ Failed to auto-recover stuck pages:', resetError);
      return 0;
    } else {
      console.log(`✅ Auto-recovered ${stuckPages.length} stuck pages`);
      return stuckPages.length;
    }
  }

  return 0;
}

async function resetFailedPages(supabaseClient: any) {
  // Reset failed pages back to pending so they can be reprocessed
  const { data: failedPages, error: failedError } = await supabaseClient
    .from('source_pages')
    .select('id, url, retry_count')
    .eq('status', 'failed')
    .lt('retry_count', 3);

  if (!failedError && failedPages && failedPages.length > 0) {
    console.log(`🔄 Resetting ${failedPages.length} failed pages for retry...`);
    
    const { error: resetError } = await supabaseClient
      .from('source_pages')
      .update({ 
        status: 'pending',
        started_at: null,
        error_message: null
      })
      .in('id', failedPages.map(p => p.id));
    
    if (resetError) {
      console.error('❌ Failed to reset failed pages:', resetError);
      return 0;
    } else {
      console.log(`✅ Reset ${failedPages.length} failed pages for retry`);
      return failedPages.length;
    }
  }

  return 0;
}

async function processPendingPages(supabaseClient: any) {
  const { data: pendingPages, error: fetchError } = await supabaseClient
    .from('source_pages')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(15);

  if (fetchError) {
    throw new Error(`Failed to fetch pending pages: ${fetchError.message}`);
  }

  if (!pendingPages || pendingPages.length === 0) {
    return {
      processedCount: 0,
      results: []
    };
  }

  console.log(`📋 Auto-processing ${pendingPages.length} pending pages...`);

  const results = [];
  
  for (const page of pendingPages) {
    try {
      console.log(`🚀 Auto-processing page: ${page.url} (ID: ${page.id})`);
      
      await supabaseClient
        .from('source_pages')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', page.id);
      
      const { data: processingResult, error: processingError } = await supabaseClient
        .functions.invoke('child-job-processor', {
          body: { childJobId: page.id }
        });

      if (processingError) {
        // Check if it's a 409 Conflict response (job already processed/in progress)
        if (processingError.message?.includes('409') || processingError.status === 409) {
          console.log(`✅ Page ${page.id} already processed (409 Conflict) - marking as completed`);
          
          // Mark as completed since it was already processed
          await supabaseClient
            .from('source_pages')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              error_message: 'Already processed by another worker'
            })
            .eq('id', page.id);
          
          results.push({
            pageId: page.id,
            url: page.url,
            success: true,
            result: { message: 'Already processed', chunksCreated: 0 },
            wasAlreadyProcessed: true
          });
          continue;
        }

        // For actual errors, increment retry count and handle retry logic
        const newRetryCount = (page.retry_count || 0) + 1;
        const shouldRetry = newRetryCount < 3;
        
        console.error(`❌ Error processing page ${page.id}: ${processingError.message}`);
        
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
        console.log(`✅ Successfully auto-processed page ${page.id} with ${processingResult?.chunksCreated || 0} chunks`);
        results.push({
          pageId: page.id,
          url: page.url,
          success: true,
          result: processingResult
        });
      }
    } catch (error) {
      // Check if it's a 409 error in the catch block as well
      if (error.message?.includes('409') || error.status === 409) {
        console.log(`✅ Page ${page.id} already processed (409 Conflict - caught) - marking as completed`);
        
        await supabaseClient
          .from('source_pages')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            error_message: 'Already processed by another worker'
          })
          .eq('id', page.id);
        
        results.push({
          pageId: page.id,
          url: page.url,
          success: true,
          result: { message: 'Already processed', chunksCreated: 0 },
          wasAlreadyProcessed: true
        });
        continue;
      }

      // For actual errors, handle retry logic
      const newRetryCount = (page.retry_count || 0) + 1;
      const shouldRetry = newRetryCount < 3;
      
      console.error(`❌ Exception processing page ${page.id}: ${error.message}`);
      
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

  // Auto-trigger parent status aggregation
  const parentIds = [...new Set(pendingPages.map(p => p.parent_source_id).filter(Boolean))];
  for (const parentId of parentIds) {
    try {
      await supabaseClient.rpc('aggregate_parent_status', { parent_id: parentId });
      console.log(`🔄 Auto-aggregated status for parent: ${parentId}`);
    } catch (error) {
      console.error(`❌ Failed to auto-aggregate parent ${parentId}:`, error);
    }
  }

  return {
    processedCount: pendingPages.length,
    results,
    affectedParents: parentIds.length
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = getSupabaseClient();

    console.log('🔄 Starting automatic source pages processing...');

    // Auto-recovery first
    const autoRecoveredCount = await autoRecoverStuckPages(supabaseClient);
    
    // Reset failed pages for retry (but be more selective)
    const resetFailedCount = await resetFailedPages(supabaseClient);

    // Process pending pages
    const processingResults = await processPendingPages(supabaseClient);

    if (processingResults.processedCount === 0 && autoRecoveredCount === 0 && resetFailedCount === 0) {
      console.log('📭 No pending source pages to process');
      
      // Check for missing chunks even if no pending pages
      try {
        const { data: missingChunksResult } = await supabaseClient
          .functions.invoke('generate-missing-chunks');
        
        if (missingChunksResult?.processedCount > 0) {
          console.log(`✅ Generated chunks for ${missingChunksResult.processedCount} completed pages`);
        }
      } catch (chunksError) {
        console.error('❌ Failed to generate missing chunks:', chunksError);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending pages to process',
          processedCount: 0,
          autoRecoveredCount,
          resetFailedCount
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const successCount = processingResults.results.filter(r => r.success).length;
    const failedCount = processingResults.results.filter(r => !r.success).length;
    const autoRetriedCount = processingResults.results.filter(r => r.autoRetried).length;
    const alreadyProcessedCount = processingResults.results.filter(r => r.wasAlreadyProcessed).length;
    const totalChunksCreated = processingResults.results.reduce((sum, r) => sum + (r.result?.chunksCreated || 0), 0);

    console.log(`📊 Auto-processing complete: ${successCount} successful (${alreadyProcessedCount} already processed), ${failedCount} failed, ${autoRetriedCount} auto-retried, ${totalChunksCreated} chunks created`);

    // Check for missing chunks after processing
    if (successCount > 0) {
      console.log('🔍 Checking for any remaining completed pages without chunks...');
      try {
        const { data: missingChunksResult } = await supabaseClient
          .functions.invoke('generate-missing-chunks');
        
        if (missingChunksResult?.processedCount > 0) {
          console.log(`✅ Additionally generated chunks for ${missingChunksResult.processedCount} completed pages`);
        }
      } catch (chunksError) {
        console.error('❌ Failed to generate missing chunks:', chunksError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: processingResults.processedCount,
        successCount,
        failedCount,
        autoRetriedCount,
        alreadyProcessedCount,
        autoRecoveredCount,
        resetFailedCount,
        totalChunksCreated,
        results: processingResults.results,
        affectedParents: processingResults.affectedParents
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
