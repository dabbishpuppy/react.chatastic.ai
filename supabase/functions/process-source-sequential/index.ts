
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceId, content, metadata = {} } = await req.json();

    if (!sourceId) {
      return new Response(
        JSON.stringify({ error: 'sourceId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔄 Sequential processing for source: ${sourceId}`);

    // If content is provided, use it directly. Otherwise, fetch from source
    let processContent = content;
    
    if (!processContent) {
      // Get the source content
      const { data: source, error: sourceError } = await supabase
        .from('agent_sources')
        .select('content, metadata, source_type, title')
        .eq('id', sourceId)
        .single();

      if (sourceError || !source) {
        console.error('❌ Source not found:', sourceError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Source not found'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      processContent = source.content || '';
      
      // For Q&A sources, construct content from question/answer
      if (source.source_type === 'qa') {
        const sourceMetadata = source.metadata as any;
        if (sourceMetadata?.question && sourceMetadata?.answer) {
          processContent = `Question: ${sourceMetadata.question}\n\nAnswer: ${sourceMetadata.answer}`;
        }
      }
    }

    if (!processContent || processContent.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No content to process',
          sourceId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 422,
        }
      );
    }

    // Step 1: Create chunks using transaction-safe method
    console.log(`📝 Step 1: Creating chunks for source ${sourceId}`);
    
    const chunkResult = await supabase.functions.invoke('create-chunks-transaction', {
      body: {
        sourceId,
        chunks: createSemanticChunks(processContent).map((chunk, index) => ({
          chunk_index: index,
          content: chunk,
          token_count: Math.ceil(chunk.length / 4),
          metadata: {
            ...metadata,
            processing_method: 'sequential',
            created_at: new Date().toISOString()
          }
        }))
      }
    });

    if (chunkResult.error) {
      console.error('❌ Chunk creation failed:', chunkResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Chunk creation failed: ${chunkResult.error.message}`,
          sourceId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const chunksCreated = chunkResult.data?.chunksCreated || 0;
    console.log(`✅ Step 1 completed: ${chunksCreated} chunks created`);

    if (chunksCreated === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          message: 'No chunks created from content',
          sourceId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Wait briefly to ensure chunk creation is fully committed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Validate chunks exist
    console.log(`🔍 Step 2: Validating chunks exist for source ${sourceId}`);
    const { data: chunks, error: validationError } = await supabase
      .from('source_chunks')
      .select('id')
      .eq('source_id', sourceId);

    if (validationError || !chunks || chunks.length === 0) {
      console.error('❌ Chunk validation failed:', validationError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Chunks were created but validation failed',
          sourceId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log(`✅ Step 2 completed: Validated ${chunks.length} chunks exist`);

    // Step 4: Generate embeddings with the validated chunk IDs
    console.log(`🤖 Step 3: Generating embeddings for source ${sourceId}`);
    
    const embeddingResult = await supabase.functions.invoke('generate-embeddings-batch', {
      body: {
        sourceId,
        chunkIds: chunks.map(c => c.id)
      }
    });

    let embeddingsGenerated = 0;
    if (embeddingResult.error) {
      console.warn('⚠️ Embedding generation failed but chunks were created:', embeddingResult.error);
    } else {
      embeddingsGenerated = embeddingResult.data?.processedCount || 0;
      console.log(`✅ Step 3 completed: ${embeddingsGenerated} embeddings generated`);
    }

    // Update source metadata to mark as completed
    await supabase
      .from('agent_sources')
      .update({ 
        metadata: {
          ...metadata,
          processing_status: 'completed',
          chunks_created: chunksCreated,
          embeddings_generated: embeddingsGenerated,
          completed_at: new Date().toISOString(),
          processing_method: 'sequential'
        }
      })
      .eq('id', sourceId);

    console.log(`✅ Sequential processing completed for source ${sourceId}`);

    return new Response(
      JSON.stringify({
        success: true,
        chunksCreated,
        embeddingsGenerated,
        message: 'Sequential processing completed successfully',
        sourceId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in sequential processing:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        chunksCreated: 0,
        embeddingsGenerated: 0
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function createSemanticChunks(content: string, maxTokens: number = 150): string[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const chunks: string[] = [];
  let currentChunk = '';
  let tokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokens = sentence.trim().split(/\s+/).length;
    
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
