
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceId, chunkIds } = await req.json();

    if (!sourceId || !chunkIds || !Array.isArray(chunkIds)) {
      throw new Error('Source ID and chunk IDs array are required');
    }

    console.log(`🤖 Batch generating embeddings for ${chunkIds.length} chunks from source: ${sourceId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key from environment
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Fetch chunks with validation that they exist and belong to the source
    const { data: chunks, error: chunksError } = await supabase
      .from('source_chunks')
      .select('id, content')
      .eq('source_id', sourceId)
      .in('id', chunkIds);

    if (chunksError) {
      console.error('❌ Error fetching chunks:', chunksError);
      throw new Error(`Failed to fetch chunks: ${chunksError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      console.log('⚠️ No valid chunks found for the provided IDs');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No valid chunks found for processing',
          processedCount: 0,
          errorCount: 0,
          totalChunks: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that all requested chunks exist
    const foundChunkIds = new Set(chunks.map(c => c.id));
    const missingChunks = chunkIds.filter(id => !foundChunkIds.has(id));
    
    if (missingChunks.length > 0) {
      console.warn(`⚠️ ${missingChunks.length} chunks not found or don't belong to source ${sourceId}`);
    }

    console.log(`📄 Processing ${chunks.length} valid chunks for embedding generation`);

    let processedCount = 0;
    let errorCount = 0;
    const embeddingsToInsert = [];

    // Generate embeddings for each chunk
    for (const chunk of chunks) {
      try {
        console.log(`🔄 Processing chunk ${chunk.id}`);

        // Skip if content is too short or empty
        if (!chunk.content || chunk.content.trim().length < 10) {
          console.log(`⚠️ Skipping chunk ${chunk.id} - content too short`);
          continue;
        }

        // Check if embedding already exists (double-check to avoid duplicates)
        const { data: existingEmbedding, error: checkError } = await supabase
          .from('source_embeddings')
          .select('id')
          .eq('chunk_id', chunk.id)
          .single();

        if (existingEmbedding) {
          console.log(`⚠️ Embedding already exists for chunk ${chunk.id}, skipping`);
          processedCount++;
          continue;
        }

        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIApiKey}`
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: chunk.content
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ OpenAI API error for chunk ${chunk.id}:`, response.status, errorText);
          errorCount++;
          continue;
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;

        // Prepare embedding for batch insert
        embeddingsToInsert.push({
          chunk_id: chunk.id,
          embedding: `[${embedding.join(',')}]`,
          model_name: 'text-embedding-3-small'
        });

        processedCount++;
        console.log(`✅ Generated embedding for chunk ${chunk.id}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Failed to generate embedding for chunk ${chunk.id}:`, error);
        errorCount++;
      }
    }

    // Batch insert all embeddings
    if (embeddingsToInsert.length > 0) {
      console.log(`💾 Inserting ${embeddingsToInsert.length} embeddings...`);
      
      const { error: insertError } = await supabase
        .from('source_embeddings')
        .insert(embeddingsToInsert);

      if (insertError) {
        console.error('❌ Failed to batch insert embeddings:', insertError);
        
        // Try individual inserts as fallback
        let individualInsertErrors = 0;
        for (const embedding of embeddingsToInsert) {
          try {
            const { error: singleInsertError } = await supabase
              .from('source_embeddings')
              .insert([embedding]);
              
            if (singleInsertError) {
              console.error(`❌ Failed to insert individual embedding for chunk ${embedding.chunk_id}:`, singleInsertError);
              individualInsertErrors++;
            }
          } catch (error) {
            console.error(`❌ Exception during individual embedding insert for chunk ${embedding.chunk_id}:`, error);
            individualInsertErrors++;
          }
        }
        
        if (individualInsertErrors > 0) {
          errorCount += individualInsertErrors;
          processedCount -= individualInsertErrors;
        }
      }
    }

    console.log(`✅ Completed batch embedding generation for source ${sourceId}: ${processedCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        errorCount,
        totalChunks: chunks.length,
        missingChunks: missingChunks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in generate-embeddings-batch function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processedCount: 0,
        errorCount: 0,
        totalChunks: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
