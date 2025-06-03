
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

    // Relaxed content length check - allow shorter content but ensure it's not empty
    if (contentSize < 20) {
      console.warn(`⚠️ Very short content (${contentSize} chars) for ${job.url}, but processing anyway`);
      
      // Try to get at least the page title if content is extremely short
      const title = extractTitle(htmlContent);
      if (title && title.length > 0) {
        const fallbackContent = `Page: ${title}`;
        console.log(`📝 Using fallback content: "${fallbackContent}"`);
        
        // Store minimal chunk with title
        const fallbackChunks = [{
          source_id: job.parent_source_id,
          chunk_index: 0,
          content: fallbackContent,
          token_count: Math.ceil(fallbackContent.length / 4),
          metadata: {
            url: job.url,
            page_id: job.id,
            content_hash: await generateContentHash(fallbackContent),
            extraction_method: 'title_fallback',
            page_title: title,
            crawled_at: new Date().toISOString(),
            original_content_length: contentSize
          }
        }];

        await insertChunks(supabaseClient, fallbackChunks);
        
        await updateJobStatus(supabaseClient, childJobId, 'completed', {
          content_size: fallbackContent.length,
          chunks_created: 1,
          processing_time_ms: Date.now() - new Date(job.started_at || job.created_at).getTime(),
          content_hash: await generateContentHash(fallbackContent)
        });

        console.log(`✅ Processed minimal content page ${childJobId} with title fallback`);

        return new Response(
          JSON.stringify({
            success: true,
            jobId: childJobId,
            parentSourceId: job.parent_source_id,
            contentSize: fallbackContent.length,
            chunksCreated: 1,
            message: 'Job processed with title fallback due to minimal content'
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

    // Create semantic chunks from the content
    const chunks = createSemanticChunks(textContent);
    console.log(`📝 Created ${chunks.length} semantic chunks`);

    // Generate content hash for deduplication
    const contentHash = await generateContentHash(textContent);

    // Store chunks in database - Link to parent source, not the individual page
    if (chunks.length > 0) {
      const chunksToInsert = chunks.map((chunk, index) => ({
        source_id: job.parent_source_id, // Use parent source ID, not the page ID
        chunk_index: index,
        content: chunk,
        token_count: Math.ceil(chunk.length / 4),
        metadata: {
          url: job.url,
          page_id: job.id, // Store page ID in metadata for reference
          content_hash: contentHash,
          extraction_method: 'semantic_chunking',
          page_title: extractTitle(htmlContent),
          crawled_at: new Date().toISOString(),
          original_content_length: contentSize
        }
      }));

      await insertChunks(supabaseClient, chunksToInsert);
      console.log(`✅ Stored ${chunks.length} chunks for parent source ${job.parent_source_id} from page ${job.id}`);
    }

    // Mark job as completed with comprehensive metadata
    await updateJobStatus(supabaseClient, childJobId, 'completed', {
      content_size: contentSize,
      chunks_created: chunks.length,
      processing_time_ms: Date.now() - new Date(job.started_at || job.created_at).getTime(),
      content_hash: contentHash
    });

    console.log(`✅ Successfully completed job ${childJobId} with ${chunks.length} chunks linked to parent ${job.parent_source_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: childJobId,
        parentSourceId: job.parent_source_id,
        contentSize,
        chunksCreated: chunks.length,
        message: 'Job processed successfully with chunks linked to parent source'
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
