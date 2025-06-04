
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

    // Get the job details
    const { data: job, error: jobError } = await supabaseClient
      .from('source_pages')
      .select('*')
      .eq('id', childJobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    // Get the parent source to ensure it exists
    const { data: parentSource, error: parentError } = await supabaseClient
      .from('agent_sources')
      .select('id, agent_id')
      .eq('id', job.parent_source_id)
      .single();

    if (parentError || !parentSource) {
      throw new Error(`Parent source not found: ${parentError?.message}`);
    }

    // Mark as in_progress
    await updateJobStatus(supabaseClient, childJobId, 'in_progress');

    console.log(`📄 Crawling URL: ${job.url}`);

    // Fetch the page content
    const response = await fetch(job.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Wonderwave-Bot/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const htmlContent = await response.text();
    const textContent = extractTextContent(htmlContent);
    const contentSize = textContent.length;

    console.log(`📏 Content extracted: ${contentSize} characters from ${job.url}`);

    // Enhanced content length check - allow shorter content but ensure it's not empty
    if (contentSize < 10) {
      console.warn(`⚠️ Very short content (${contentSize} chars) for ${job.url}, trying title fallback`);
      
      // Try to get at least the page title if content is extremely short
      const title = extractTitle(htmlContent);
      if (title && title.length > 0) {
        const fallbackContent = `Page: ${title}`;
        console.log(`📝 Using fallback content: "${fallbackContent}"`);
        
        // Mark job as completed but don't create chunks yet - wait for manual training
        await updateJobStatus(supabaseClient, childJobId, 'completed', {
          content_size: fallbackContent.length,
          chunks_created: 0, // No chunks created yet
          processing_time_ms: Date.now() - new Date(job.started_at || job.created_at).getTime(),
          content_hash: await generateContentHash(fallbackContent),
          processing_status: 'pending' // Mark as pending processing
        });

        // Mark parent source as requiring manual training
        await supabaseClient
          .from('agent_sources')
          .update({ requires_manual_training: true })
          .eq('id', job.parent_source_id);

        console.log(`✅ Crawled page ${childJobId} - content ready for manual training`);

        return new Response(
          JSON.stringify({
            success: true,
            jobId: childJobId,
            parentSourceId: job.parent_source_id,
            contentSize: fallbackContent.length,
            chunksCreated: 0,
            message: 'Page crawled successfully - ready for manual training'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else {
        throw new Error(`No meaningful content found for ${job.url} (${contentSize} chars, no title)`);
      }
    }

    // Generate content hash for deduplication
    const contentHash = await generateContentHash(textContent);

    // Store the crawled content but don't create chunks yet - wait for manual training
    // Update the source_pages record with crawled content metadata
    await supabaseClient
      .from('source_pages')
      .update({
        content_hash: contentHash,
        content_size: contentSize,
        processing_status: 'pending', // Mark as pending processing
        metadata: {
          title: extractTitle(htmlContent),
          crawled_at: new Date().toISOString(),
          ready_for_processing: true
        }
      })
      .eq('id', childJobId);

    // Mark job as completed (crawled) but processing is pending
    await updateJobStatus(supabaseClient, childJobId, 'completed', {
      content_size: contentSize,
      chunks_created: 0, // No chunks created yet
      processing_time_ms: Date.now() - new Date(job.started_at || job.created_at).getTime(),
      content_hash: contentHash
    });

    // Mark parent source as requiring manual training
    await supabaseClient
      .from('agent_sources')
      .update({ requires_manual_training: true })
      .eq('id', job.parent_source_id);

    console.log(`✅ Successfully crawled page ${childJobId} - content ready for manual training`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: childJobId,
        parentSourceId: job.parent_source_id,
        contentSize,
        chunksCreated: 0,
        message: 'Page crawled successfully - ready for manual training'
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
        await updateJobStatus(supabaseClient, childJobId, 'failed', {
          error_message: error.message
        });
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
