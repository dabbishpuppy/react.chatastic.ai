
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

    console.log('🔍 Finding completed pages without chunks...');

    // Find completed source pages that don't have any chunks
    const { data: pagesWithoutChunks, error: searchError } = await supabaseClient
      .from('source_pages')
      .select(`
        id, 
        url, 
        parent_source_id,
        content_size,
        metadata
      `)
      .eq('status', 'completed')
      .gt('content_size', 100)
      .limit(50); // Process in batches

    if (searchError) {
      console.error('❌ Failed to search for pages:', searchError);
      throw new Error(`Failed to search for pages: ${searchError.message}`);
    }

    if (!pagesWithoutChunks || pagesWithoutChunks.length === 0) {
      console.log('✅ All completed pages already have chunks');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No missing chunks found',
          processedCount: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Filter pages that actually don't have chunks
    const pagesNeedingChunks = [];
    for (const page of pagesWithoutChunks) {
      const { data: existingChunks } = await supabaseClient
        .from('source_chunks')
        .select('id')
        .eq('source_id', page.id)
        .limit(1);

      if (!existingChunks || existingChunks.length === 0) {
        pagesNeedingChunks.push(page);
      }
    }

    console.log(`📋 Found ${pagesNeedingChunks.length} pages that need chunks generated`);

    const results = [];
    
    for (const page of pagesNeedingChunks) {
      try {
        console.log(`🔄 Generating chunks for page: ${page.url} (ID: ${page.id})`);

        // Re-fetch the page content
        const response = await fetch(page.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Wonderwave-Bot/1.0)'
          }
        });

        if (!response.ok) {
          console.warn(`⚠️ Failed to re-fetch ${page.url}: HTTP ${response.status}`);
          continue;
        }

        const htmlContent = await response.text();
        const textContent = extractTextContent(htmlContent);

        if (textContent.length < 100) {
          console.warn(`⚠️ Content too short for ${page.url}`);
          continue;
        }

        // Create semantic chunks
        const chunks = createSemanticChunks(textContent);
        
        if (chunks.length === 0) {
          console.warn(`⚠️ No valid chunks created for ${page.url}`);
          continue;
        }

        // Generate content hash
        const contentHash = await generateContentHash(textContent);

        // Store chunks in database
        const chunksToInsert = chunks.map((chunk, index) => ({
          source_id: page.id,
          chunk_index: index,
          content: chunk,
          token_count: Math.ceil(chunk.length / 4),
          metadata: {
            url: page.url,
            content_hash: contentHash,
            extraction_method: 'missing_chunks_recovery',
            generated_at: new Date().toISOString()
          }
        }));

        const { error: chunkError } = await supabaseClient
          .from('source_chunks')
          .insert(chunksToInsert);

        if (chunkError) {
          console.error(`❌ Failed to insert chunks for ${page.id}:`, chunkError);
          results.push({
            pageId: page.id,
            url: page.url,
            success: false,
            error: chunkError.message
          });
          continue;
        }

        // Update the page metadata to indicate chunks were generated
        await supabaseClient
          .from('source_pages')
          .update({
            metadata: {
              ...(page.metadata || {}),
              chunks_generated: true,
              chunks_generated_at: new Date().toISOString(),
              chunks_count: chunks.length
            }
          })
          .eq('id', page.id);

        console.log(`✅ Generated ${chunks.length} chunks for page ${page.id}`);
        
        results.push({
          pageId: page.id,
          url: page.url,
          success: true,
          chunksCreated: chunks.length
        });

      } catch (error) {
        console.error(`❌ Error processing page ${page.id}:`, error);
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
    const totalChunks = results.reduce((sum, r) => sum + (r.chunksCreated || 0), 0);

    console.log(`📊 Chunk generation complete: ${successCount} successful, ${failedCount} failed, ${totalChunks} total chunks created`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: pagesNeedingChunks.length,
        successCount,
        failedCount,
        totalChunksCreated: totalChunks,
        results,
        message: `Generated chunks for ${successCount} pages`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Chunk generation error:', error);
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

// Helper functions (same as in child-job-processor)
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

function createSemanticChunks(content: string, maxTokens: number = 150): string[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const chunks: string[] = [];
  let currentChunk = '';
  let tokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.trim().length / 3.5);
    
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

async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
