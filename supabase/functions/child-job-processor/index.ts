
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

    if (contentSize < 100) {
      throw new Error('Content too short after extraction');
    }

    // Create semantic chunks from the content
    const chunks = createSemanticChunks(textContent);
    console.log(`📝 Created ${chunks.length} semantic chunks`);

    // Generate content hash for deduplication
    const contentHash = await generateContentHash(textContent);

    // Calculate compression ratio (simple estimation)
    const compressionRatio = Math.min(0.7, Math.max(0.3, 1000 / contentSize));
    const compressedSize = Math.round(contentSize * compressionRatio);

    // Store chunks in database - IMPORTANT: Link to parent source, not the individual page
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
          extraction_method: 'automatic',
          page_title: extractTitle(htmlContent),
          crawled_at: new Date().toISOString()
        }
      }));

      await insertChunks(supabaseClient, chunksToInsert);
      console.log(`✅ Stored ${chunks.length} chunks for parent source ${job.parent_source_id} from page ${job.id}`);
    }

    // Mark job as completed with comprehensive metadata
    await updateJobStatus(supabaseClient, childJobId, 'completed', {
      content_size: contentSize,
      compressed_size: compressedSize,
      compression_ratio: compressionRatio,
      chunks_created: chunks.length,
      duplicates_found: 0,
      content_hash: contentHash,
      metadata: {
        url: job.url,
        title: extractTitle(htmlContent),
        processing_method: 'automatic',
        chunks_generated: true,
        processing_timestamp: new Date().toISOString(),
        linked_to_parent: job.parent_source_id
      }
    });

    console.log(`✅ Successfully completed job ${childJobId} with ${chunks.length} chunks linked to parent ${job.parent_source_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: childJobId,
        parentSourceId: job.parent_source_id,
        contentSize,
        compressedSize,
        compressionRatio,
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
