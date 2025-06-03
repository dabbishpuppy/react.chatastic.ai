
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient, insertChunks } from '../_shared/database-helpers.ts';
import { extractTextContent, createSemanticChunks, generateContentHash } from '../_shared/content-processing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function findPagesWithoutChunks(supabaseClient: any) {
  const { data: pagesWithoutChunks, error: searchError } = await supabaseClient
    .from('source_pages')
    .select('id, url, parent_source_id, content_size, metadata')
    .eq('status', 'completed')
    .gt('content_size', 100)
    .limit(50);

  if (searchError) {
    throw new Error(`Failed to search for pages: ${searchError.message}`);
  }

  if (!pagesWithoutChunks || pagesWithoutChunks.length === 0) {
    return [];
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

  return pagesNeedingChunks;
}

async function processPageForChunks(supabaseClient: any, page: any) {
  console.log(`🔄 Generating chunks for page: ${page.url} (ID: ${page.id})`);

  // Re-fetch the page content
  const response = await fetch(page.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Wonderwave-Bot/1.0)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to re-fetch ${page.url}: HTTP ${response.status}`);
  }

  const htmlContent = await response.text();
  const textContent = extractTextContent(htmlContent);

  if (textContent.length < 100) {
    throw new Error(`Content too short for ${page.url}`);
  }

  // Create semantic chunks
  const chunks = createSemanticChunks(textContent);
  
  if (chunks.length === 0) {
    throw new Error(`No valid chunks created for ${page.url}`);
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

  await insertChunks(supabaseClient, chunksToInsert);

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
  
  return {
    pageId: page.id,
    url: page.url,
    success: true,
    chunksCreated: chunks.length
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = getSupabaseClient();

    console.log('🔍 Finding completed pages without chunks...');

    const pagesNeedingChunks = await findPagesWithoutChunks(supabaseClient);

    if (pagesNeedingChunks.length === 0) {
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

    console.log(`📋 Found ${pagesNeedingChunks.length} pages that need chunks generated`);

    const results = [];
    
    for (const page of pagesNeedingChunks) {
      try {
        const result = await processPageForChunks(supabaseClient, page);
        results.push(result);
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
