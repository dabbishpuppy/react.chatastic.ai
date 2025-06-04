
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient, insertChunks } from '../_shared/database-helpers.ts';
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
    const { pageId } = await req.json();

    if (!pageId) {
      throw new Error('pageId is required');
    }

    console.log(`🔄 Processing content for page: ${pageId}`);

    // Get the page details
    const { data: page, error: pageError } = await supabaseClient
      .from('source_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      throw new Error(`Page not found: ${pageError?.message}`);
    }

    // Re-fetch the content to process it
    const response = await fetch(page.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Wonderwave-Bot/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const htmlContent = await response.text();
    const textContent = extractTextContent(htmlContent);

    // Handle minimal content
    if (textContent.length < 10) {
      const title = extractTitle(htmlContent);
      if (title && title.length > 0) {
        const fallbackContent = `Page: ${title}`;
        
        const fallbackChunks = [{
          source_id: page.parent_source_id,
          chunk_index: 0,
          content: fallbackContent,
          token_count: Math.ceil(fallbackContent.length / 4),
          metadata: {
            url: page.url,
            page_id: page.id,
            content_hash: await generateContentHash(fallbackContent),
            extraction_method: 'title_fallback',
            page_title: title,
            processed_at: new Date().toISOString(),
            original_content_length: textContent.length
          }
        }];

        await insertChunks(supabaseClient, fallbackChunks);
        
        // Generate embeddings
        try {
          await supabaseClient.functions.invoke('generate-embeddings', {
            body: { sourceId: page.parent_source_id }
          });
        } catch (error) {
          console.warn('⚠️ Could not trigger embedding generation:', error);
        }

        return new Response(
          JSON.stringify({
            success: true,
            chunksCreated: 1,
            message: 'Processed with title fallback'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        throw new Error(`No meaningful content found for ${page.url}`);
      }
    }

    // Create semantic chunks from the content
    const chunks = createSemanticChunks(textContent);
    console.log(`📝 Created ${chunks.length} semantic chunks`);

    // Generate content hash
    const contentHash = await generateContentHash(textContent);

    // Store chunks in database - Link to parent source
    if (chunks.length > 0) {
      const chunksToInsert = chunks.map((chunk, index) => ({
        source_id: page.parent_source_id,
        chunk_index: index,
        content: chunk,
        token_count: Math.ceil(chunk.length / 4),
        metadata: {
          url: page.url,
          page_id: page.id,
          content_hash: contentHash,
          extraction_method: 'semantic_chunking',
          page_title: extractTitle(htmlContent),
          processed_at: new Date().toISOString(),
          original_content_length: textContent.length
        }
      }));

      await insertChunks(supabaseClient, chunksToInsert);
      console.log(`✅ Stored ${chunks.length} chunks for parent source ${page.parent_source_id}`);
    }

    // Generate embeddings for new chunks
    if (chunks.length > 0) {
      try {
        console.log(`🤖 Generating embeddings for source ${page.parent_source_id}`);
        await supabaseClient.functions.invoke('generate-embeddings', {
          body: { sourceId: page.parent_source_id }
        });
        console.log('✅ Embedding generation completed');
      } catch (error) {
        console.warn('⚠️ Could not trigger embedding generation:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunksCreated: chunks.length,
        message: 'Content processed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Content processing error:', error);
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
