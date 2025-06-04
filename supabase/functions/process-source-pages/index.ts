
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
      
      // Mark as in_progress before processing
      await supabaseClient
        .from('source_pages')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', page.id);
      
      console.log(`📞 Invoking child-job-processor for page ${page.id}`);
      const { data: processingResult, error: processingError } = await supabaseClient
        .functions.invoke('child-job-processor', {
          body: { childJobId: page.id }
        });

      console.log(`📋 Processing result for page ${page.id}:`, {
        data: processingResult,
        error: processingError,
        success: !processingError
      });

      // FIXED: Properly handle 409 conflicts as successful operations
      if (processingError) {
        const isConflictError = processingError.message?.includes('409') || 
                               processingError.status === 409 ||
                               processingError.message?.includes('already processed') ||
                               processingError.message?.includes('Job already processed') ||
                               processingError.message?.includes('could not be claimed');

        if (isConflictError) {
          console.log(`✅ Page ${page.id} already processed successfully (409 conflict resolved)`);
          
          // Mark as completed since it was already processed successfully
          await supabaseClient
            .from('source_pages')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              error_message: null,
              processing_time_ms: Date.now() - new Date(page.started_at || page.created_at).getTime()
            })
            .eq('id', page.id);
          
          results.push({
            pageId: page.id,
            url: page.url,
            success: true,
            result: { message: 'Successfully handled - job conflict resolved', chunksCreated: 0 },
            wasConflictResolved: true
          });
          continue;
        }

        // For actual errors (5xx, network issues, etc), increment retry count
        const newRetryCount = (page.retry_count || 0) + 1;
        const shouldRetry = newRetryCount < 3;
        
        console.error(`❌ Actual error processing page ${page.id}: ${processingError.message}`);
        
        await supabaseClient
          .from('source_pages')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            error_message: processingError.message,
            completed_at: shouldRetry ? null : new Date().toISOString(),
            retry_count: newRetryCount,
            started_at: null
          })
          .eq('id', page.id);
        
        results.push({
          pageId: page.id,
          url: page.url,
          success: false,
          error: processingError.message,
          autoRetried: shouldRetry,
          retryCount: newRetryCount
        });
      } else {
        console.log(`✅ Successfully processed page ${page.id}`);
        
        // Verify the status was updated correctly
        const { data: updatedPage } = await supabaseClient
          .from('source_pages')
          .select('status, completed_at')
          .eq('id', page.id)
          .single();
        
        if (updatedPage?.status !== 'completed') {
          console.log(`⚠️ Page ${page.id} not marked as completed, updating status`);
          await supabaseClient
            .from('source_pages')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              processing_time_ms: Date.now() - new Date(page.started_at || page.created_at).getTime()
            })
            .eq('id', page.id);
        }
        
        results.push({
          pageId: page.id,
          url: page.url,
          success: true,
          result: processingResult
        });
      }
    } catch (error) {
      // Handle 409 errors in the catch block as well
      const isConflictError = error.message?.includes('409') || 
                             error.status === 409 ||
                             error.message?.includes('already processed') ||
                             error.message?.includes('could not be claimed');

      if (isConflictError) {
        console.log(`✅ Page ${page.id} already processed successfully (409 caught exception)`);
        
        await supabaseClient
          .from('source_pages')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            error_message: null,
            processing_time_ms: Date.now() - new Date(page.started_at || page.created_at).getTime()
          })
          .eq('id', page.id);
        
        results.push({
          pageId: page.id,
          url: page.url,
          success: true,
          result: { message: 'Successfully handled - job conflict resolved', chunksCreated: 0 },
          wasConflictResolved: true
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
          retry_count: newRetryCount,
          started_at: null
        })
        .eq('id', page.id);
      
      results.push({
        pageId: page.id,
        url: page.url,
        success: false,
        error: error.message,
        autoRetried: shouldRetry,
        retryCount: newRetryCount
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
    
    // Reset failed pages for retry
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
    const conflictResolvedCount = processingResults.results.filter(r => r.wasConflictResolved).length;
    const totalChunksCreated = processingResults.results.reduce((sum, r) => sum + (r.result?.chunksCreated || 0), 0);

    console.log(`📊 Processing complete: ${successCount} successful (${conflictResolvedCount} conflicts resolved), ${failedCount} failed, ${autoRetriedCount} auto-retried, ${totalChunksCreated} chunks created`);

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
        conflictResolvedCount,
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
