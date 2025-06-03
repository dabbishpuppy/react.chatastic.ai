
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient } from '../_shared/database-helpers.ts';

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
    
    console.log('🔍 Starting missing chunks and embeddings generation...');

    // Find completed source pages that don't have chunks yet
    const { data: pagesWithoutChunks, error: pagesError } = await supabaseClient
      .from('source_pages')
      .select(`
        id,
        url,
        parent_source_id,
        content_size,
        status
      `)
      .eq('status', 'completed')
      .gt('content_size', 0);

    if (pagesError) {
      throw new Error(`Failed to fetch pages: ${pagesError.message}`);
    }

    console.log(`📊 Found ${pagesWithoutChunks?.length || 0} completed pages`);

    // Filter pages that don't have chunks
    let pagesNeedingChunks = [];
    if (pagesWithoutChunks && pagesWithoutChunks.length > 0) {
      for (const page of pagesWithoutChunks) {
        const { data: existingChunks } = await supabaseClient
          .from('source_chunks')
          .select('id')
          .eq('source_id', page.parent_source_id)
          .contains('metadata', { page_id: page.id })
          .limit(1);

        if (!existingChunks || existingChunks.length === 0) {
          pagesNeedingChunks.push(page);
        }
      }
    }

    console.log(`📝 Found ${pagesNeedingChunks.length} pages without chunks`);

    // Process pages without chunks
    let chunksCreated = 0;
    for (const page of pagesNeedingChunks) {
      try {
        console.log(`🔄 Processing page ${page.id}: ${page.url}`);
        
        const { data: result, error: processError } = await supabaseClient
          .functions.invoke('child-job-processor', {
            body: { childJobId: page.id }
          });

        if (processError) {
          console.error(`❌ Failed to process page ${page.id}:`, processError);
          continue;
        }

        if (result?.success) {
          chunksCreated += result.chunksCreated || 0;
          console.log(`✅ Created ${result.chunksCreated || 0} chunks for page ${page.id}`);
        }
      } catch (error) {
        console.error(`❌ Error processing page ${page.id}:`, error);
      }
    }

    // Find chunks without embeddings
    const { data: chunksWithoutEmbeddings, error: chunksError } = await supabaseClient
      .from('source_chunks')
      .select(`
        id,
        source_id,
        content,
        agent_sources!inner(agent_id)
      `)
      .is('source_embeddings.id', null)
      .limit(100);

    if (chunksError) {
      console.warn('Could not fetch chunks without embeddings:', chunksError);
    }

    console.log(`🤖 Found ${chunksWithoutEmbeddings?.length || 0} chunks without embeddings`);

    // Generate embeddings for chunks without them
    let embeddingsGenerated = 0;
    const processedSources = new Set();
    
    if (chunksWithoutEmbeddings && chunksWithoutEmbeddings.length > 0) {
      for (const chunk of chunksWithoutEmbeddings) {
        const sourceId = chunk.source_id;
        
        // Only process each source once
        if (!processedSources.has(sourceId)) {
          processedSources.add(sourceId);
          
          try {
            console.log(`🤖 Generating embeddings for source ${sourceId}`);
            
            const { data: embeddingResult, error: embeddingError } = await supabaseClient
              .functions.invoke('generate-embeddings', {
                body: { sourceId }
              });

            if (embeddingError) {
              console.error(`❌ Failed to generate embeddings for source ${sourceId}:`, embeddingError);
              continue;
            }

            if (embeddingResult?.success) {
              embeddingsGenerated += embeddingResult.processedCount || 0;
              console.log(`✅ Generated ${embeddingResult.processedCount || 0} embeddings for source ${sourceId}`);
            }
          } catch (error) {
            console.error(`❌ Error generating embeddings for source ${sourceId}:`, error);
          }
        }
      }
    }

    console.log(`✅ Completed missing chunks generation: ${chunksCreated} chunks created, ${embeddingsGenerated} embeddings generated`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: pagesNeedingChunks.length,
        chunksCreated,
        embeddingsGenerated,
        sourcesProcessed: processedSources.size,
        message: `Generated ${chunksCreated} chunks and ${embeddingsGenerated} embeddings`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Missing chunks generation error:', error);
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
