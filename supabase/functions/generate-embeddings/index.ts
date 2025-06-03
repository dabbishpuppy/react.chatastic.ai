
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
    const { sourceId } = await req.json();

    if (!sourceId) {
      throw new Error('Source ID is required');
    }

    console.log(`🤖 Generating embeddings for source: ${sourceId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key from environment
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get chunks for this source that don't have embeddings
    const { data: chunks, error: chunksError } = await supabase
      .from('source_chunks')
      .select(`
        id,
        content,
        source_embeddings!left(id)
      `)
      .eq('source_id', sourceId)
      .is('source_embeddings.id', null);

    if (chunksError) {
      console.error('❌ Error fetching chunks:', chunksError);
      throw chunksError;
    }

    if (!chunks || chunks.length === 0) {
      console.log('⚠️ No chunks without embeddings found for source:', sourceId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No chunks without embeddings to process',
          processedCount: 0,
          errorCount: 0,
          totalChunks: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Processing ${chunks.length} chunks without embeddings for source ${sourceId}`);

    let processedCount = 0;
    let errorCount = 0;

    // Generate embeddings for each chunk
    for (const chunk of chunks) {
      try {
        console.log(`🔄 Processing chunk ${chunk.id}`);

        // Skip if content is too short or empty
        if (!chunk.content || chunk.content.trim().length < 10) {
          console.log(`⚠️ Skipping chunk ${chunk.id} - content too short`);
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

        // Store embedding in database
        const { error: embeddingError } = await supabase
          .from('source_embeddings')
          .upsert({
            chunk_id: chunk.id,
            embedding: `[${embedding.join(',')}]`,
            model_name: 'text-embedding-3-small'
          });

        if (embeddingError) {
          console.error(`❌ Failed to store embedding for chunk ${chunk.id}:`, embeddingError);
          errorCount++;
        } else {
          processedCount++;
          console.log(`✅ Generated embedding for chunk ${chunk.id}`);
        }

      } catch (error) {
        console.error(`❌ Failed to generate embedding for chunk ${chunk.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Completed embedding generation for source ${sourceId}: ${processedCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        errorCount,
        totalChunks: chunks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in generate-embeddings function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
