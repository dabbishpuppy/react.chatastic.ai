
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient, updateJobStatus, insertChunks } from '../_shared/database-helpers.ts';
import { extractTextContent, extractTitle, createSemanticChunks, generateContentHash } from '../_shared/content-processing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = getSupabaseClient();
    const { childJobId } = await req.json();

    if (!childJobId) {
      throw new Error('childJobId is required');
    }

    console.log(`🚀 Processing child job: ${childJobId}`);

    // ATOMIC JOB CLAIMING: Try to claim the job atomically to prevent duplicate processing
    const { data: claimedJob, error: claimError } = await supabaseClient
      .from('source_pages')
      .update({
        status: 'in_progress', // CLEAN STATUS TRANSITION: pending -> in_progress
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', childJobId)
      .eq('status', 'pending') // Only claim if still pending
      .select()
      .single();

    // Return success when job is already claimed (not an error)
    if (claimError || !claimedJob) {
      console.log(`⚠️ Job ${childJobId} could not be claimed (already processed or in progress)`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Job already claimed or completed by another worker',
          jobId: childJobId,
          skipped: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`✅ Successfully claimed job ${childJobId} for URL: ${claimedJob.url}`);

    // Get the parent source to ensure it exists
    const { data: parentSource, error: parentError } = await supabaseClient
      .from('agent_sources')
      .select('id, agent_id')
      .eq('id', claimedJob.parent_source_id)
      .single();

    if (parentError || !parentSource) {
      await updateJobStatus(supabaseClient, childJobId, 'failed', {
        error_message: `Parent source not found: ${parentError?.message}`
      });
      throw new Error(`Parent source not found: ${parentError?.message}`);
    }

    console.log(`📄 Crawling URL: ${claimedJob.url}`);

    // Check if this URL was already processed successfully for this parent
    const { data: existingPages, error: duplicateCheckError } = await supabaseClient
      .from('source_pages')
      .select('id, status, url')
      .eq('parent_source_id', claimedJob.parent_source_id)
      .eq('url', claimedJob.url)
      .eq('status', 'completed')
      .neq('id', childJobId);

    if (!duplicateCheckError && existingPages && existingPages.length > 0) {
      console.log(`⚠️ URL ${claimedJob.url} already processed successfully, marking as duplicate`);
      
      // CLEAN STATUS TRANSITION: in_progress -> completed (no intermediate states)
      await supabaseClient
        .from('source_pages')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          content_size: 0,
          chunks_created: 0,
          processing_time_ms: Date.now() - new Date(claimedJob.started_at || claimedJob.created_at).getTime(),
          error_message: 'Duplicate URL - already processed',
          processing_status: 'processed' // Mark as processed since it's a duplicate
        })
        .eq('id', childJobId);

      return new Response(
        JSON.stringify({
          success: true,
          jobId: childJobId,
          parentSourceId: claimedJob.parent_source_id,
          contentSize: 0,
          chunksCreated: 0,
          message: 'Duplicate URL detected - skipped processing'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Fetch the page content with timeout and retries
    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        response = await fetch(claimedJob.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Wonderwave-Bot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (response.ok) {
          break; // Success, exit retry loop
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Attempt ${attempts} failed for ${claimedJob.url}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to fetch after ${maxAttempts} attempts: ${error.message}`);
        }
        console.log(`Attempt ${attempts} failed for ${claimedJob.url}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!response || !response.ok) {
      throw new Error(`HTTP ${response?.status}: ${response?.statusText}`);
    }

    const htmlContent = await response.text();
    const textContent = extractTextContent(htmlContent);
    const contentSize = textContent.length;

    console.log(`📏 Content extracted: ${contentSize} characters from ${claimedJob.url}`);

    // Enhanced content length check - allow shorter content but ensure it's not empty
    if (contentSize < 10) {
      console.warn(`⚠️ Very short content (${contentSize} chars) for ${claimedJob.url}, trying title fallback`);
      
      // Try to get at least the page title if content is extremely short
      const title = extractTitle(htmlContent);
      if (title && title.length > 0) {
        const fallbackContent = `Page: ${title}`;
        console.log(`📝 Using fallback content: "${fallbackContent}"`);
        
        // CLEAN STATUS TRANSITION: in_progress -> completed (single atomic update)
        await supabaseClient
          .from('source_pages')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            content_size: fallbackContent.length,
            chunks_created: 0,
            processing_time_ms: Date.now() - new Date(claimedJob.started_at || claimedJob.created_at).getTime(),
            content_hash: await generateContentHash(fallbackContent),
            processing_status: 'pending' // Mark as pending for future processing
          })
          .eq('id', childJobId);

        return new Response(
          JSON.stringify({
            success: true,
            jobId: childJobId,
            parentSourceId: claimedJob.parent_source_id,
            contentSize: fallbackContent.length,
            chunksCreated: 0,
            message: 'Page crawled successfully - ready for training'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else {
        throw new Error(`No meaningful content found for ${claimedJob.url} (${contentSize} chars, no title)`);
      }
    }

    // Generate content hash for deduplication
    const contentHash = await generateContentHash(textContent);

    // Check if this exact content was already processed (content-based deduplication)
    const { data: duplicateContent, error: contentDupeError } = await supabaseClient
      .from('source_pages')
      .select('id, url')
      .eq('parent_source_id', claimedJob.parent_source_id)
      .eq('content_hash', contentHash)
      .eq('status', 'completed')
      .neq('id', childJobId)
      .limit(1);

    if (!contentDupeError && duplicateContent && duplicateContent.length > 0) {
      console.log(`⚠️ Content from ${claimedJob.url} already exists (duplicate of ${duplicateContent[0].url})`);
      
      // CLEAN STATUS TRANSITION: in_progress -> completed (single atomic update)
      await supabaseClient
        .from('source_pages')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          content_size: contentSize,
          chunks_created: 0,
          processing_time_ms: Date.now() - new Date(claimedJob.started_at || claimedJob.created_at).getTime(),
          content_hash: contentHash,
          processing_status: 'processed', // Mark as processed since it's a duplicate
          error_message: `Duplicate content of ${duplicateContent[0].url}`
        })
        .eq('id', childJobId);

      return new Response(
        JSON.stringify({
          success: true,
          jobId: childJobId,
          parentSourceId: claimedJob.parent_source_id,
          contentSize,
          chunksCreated: 0,
          message: 'Duplicate content detected - skipped processing'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // CLEAN STATUS TRANSITION: in_progress -> completed (single atomic update with all data)
    await supabaseClient
      .from('source_pages')
      .update({
        status: 'completed', // Final status - no more changes to this field
        completed_at: new Date().toISOString(),
        content_hash: contentHash,
        content_size: contentSize,
        chunks_created: 0, // Will be updated when chunks are actually created
        processing_time_ms: Date.now() - new Date(claimedJob.started_at || claimedJob.created_at).getTime(),
        processing_status: 'pending', // Ready for chunk processing
        metadata: {
          title: extractTitle(htmlContent),
          crawled_at: new Date().toISOString(),
          ready_for_processing: true
        }
      })
      .eq('id', childJobId);

    console.log(`✅ Successfully crawled page ${childJobId} - content ready for processing`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: childJobId,
        parentSourceId: claimedJob.parent_source_id,
        contentSize,
        chunksCreated: 0,
        message: 'Page crawled successfully - ready for processing'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Job processing error:', error);

    // Try to mark job as failed if we have the ID
    try {
      const { childJobId } = await req.json().catch(() => ({}));
      if (childJobId) {
        const supabaseClient = getSupabaseClient();
        await supabaseClient
          .from('source_pages')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message,
            processing_time_ms: Date.now() - Date.now() // Fallback timing
          })
          .eq('id', childJobId);
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

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
