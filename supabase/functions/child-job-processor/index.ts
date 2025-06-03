
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

    // Mark as in_progress
    await supabaseClient
      .from('source_pages')
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', childJobId);

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
    
    // Extract text content from HTML
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

    // Store chunks in database
    if (chunks.length > 0) {
      const chunksToInsert = chunks.map((chunk, index) => ({
        source_id: childJobId,
        chunk_index: index,
        content: chunk,
        token_count: Math.ceil(chunk.length / 4), // Rough token estimation
        metadata: {
          url: job.url,
          content_hash: contentHash,
          extraction_method: 'automatic'
        }
      }));

      const { error: chunkError } = await supabaseClient
        .from('source_chunks')
        .insert(chunksToInsert);

      if (chunkError) {
        console.error('❌ Failed to insert chunks:', chunkError);
        throw new Error(`Failed to store chunks: ${chunkError.message}`);
      }

      console.log(`✅ Stored ${chunks.length} chunks for job ${childJobId}`);
    }

    // Mark job as completed with comprehensive metadata
    await supabaseClient
      .from('source_pages')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        content_size: contentSize,
        compressed_size: compressedSize,
        compression_ratio: compressionRatio,
        chunks_created: chunks.length,
        duplicates_found: 0, // Will be calculated during deduplication
        content_hash: contentHash,
        metadata: {
          url: job.url,
          title: extractTitle(htmlContent),
          processing_method: 'automatic',
          chunks_generated: true,
          processing_timestamp: new Date().toISOString()
        }
      })
      .eq('id', childJobId);

    console.log(`✅ Successfully completed job ${childJobId} with ${chunks.length} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: childJobId,
        contentSize,
        compressedSize,
        compressionRatio,
        chunksCreated: chunks.length,
        message: 'Job processed successfully with chunks generated'
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
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabaseClient
          .from('source_pages')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message
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

// Helper function to extract text content from HTML
function extractTextContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to extract title from HTML
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : '';
}

// Helper function to create semantic chunks
function createSemanticChunks(content: string, maxTokens: number = 150): string[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const chunks: string[] = [];
  let currentChunk = '';
  let tokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.trim().length / 3.5); // More accurate token estimation
    
    if (tokenCount + sentenceTokens > maxTokens && currentChunk) {
      if (currentChunk.trim().length > 30) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
      tokenCount = sentenceTokens;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
      tokenCount += sentenceTokens;
    }
  }
  
  if (currentChunk.trim().length > 30) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 20);
}

// Helper function to generate content hash
async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
