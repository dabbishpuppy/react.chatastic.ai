
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
    const { sourceId, chunks } = await req.json();

    if (!sourceId || !chunks || !Array.isArray(chunks)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: sourceId and chunks array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔄 Creating ${chunks.length} chunks for source ${sourceId} in transaction`);

    // Start a transaction-like operation with validation
    
    // First, verify the source exists
    const { data: sourceExists, error: sourceError } = await supabase
      .from('agent_sources')
      .select('id')
      .eq('id', sourceId)
      .single();

    if (sourceError || !sourceExists) {
      console.error('❌ Source validation failed:', sourceError);
      return new Response(
        JSON.stringify({ error: `Source ${sourceId} does not exist or is inaccessible: ${sourceError?.message}` }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if chunks already exist for this source to avoid duplicates
    const { data: existingChunks, error: existingError } = await supabase
      .from('source_chunks')
      .select('chunk_index')
      .eq('source_id', sourceId);

    if (existingError) {
      console.error('❌ Error checking existing chunks:', existingError);
      return new Response(
        JSON.stringify({ error: `Failed to check existing chunks: ${existingError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const existingIndexes = new Set(existingChunks?.map(c => c.chunk_index) || []);
    const newChunks = chunks.filter(chunk => !existingIndexes.has(chunk.chunk_index));

    if (newChunks.length === 0) {
      console.log('⚠️ All chunks already exist for this source');
      return new Response(
        JSON.stringify({ 
          success: true, 
          chunksCreated: 0,
          message: 'All chunks already exist',
          sourceId 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare chunks for insertion
    const chunksToInsert = newChunks.map(chunk => ({
      source_id: sourceId,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      token_count: chunk.token_count || Math.ceil(chunk.content.length / 4),
      metadata: {
        ...chunk.metadata,
        created_at: new Date().toISOString(),
        creation_method: 'transaction_safe'
      }
    }));

    // Insert all chunks atomically
    const { data: insertedChunks, error: insertError } = await supabase
      .from('source_chunks')
      .insert(chunksToInsert)
      .select('id, chunk_index');

    if (insertError) {
      console.error('❌ Failed to insert chunks:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to insert chunks: ${insertError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Successfully created ${insertedChunks?.length || 0} chunks for source ${sourceId}`);

    // Verify the insertion was successful
    const { data: verificationChunks, error: verifyError } = await supabase
      .from('source_chunks')
      .select('id')
      .eq('source_id', sourceId);

    if (verifyError) {
      console.warn('⚠️ Could not verify chunk creation:', verifyError);
    } else {
      console.log(`✅ Verification: ${verificationChunks?.length || 0} total chunks now exist for source ${sourceId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksCreated: insertedChunks?.length || 0,
        totalChunks: verificationChunks?.length || 0,
        sourceId,
        insertedChunkIds: insertedChunks?.map(c => c.id) || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in create-chunks-transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
