
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
    const { sourceId, content, sourceType } = await req.json();

    if (!sourceId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: sourceId and content' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔄 Generating chunks for source ${sourceId} (${sourceType})`);

    // Simple chunking: split content into chunks of ~1000 characters
    const chunkSize = 1000;
    const chunks = [];
    
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      if (chunk.trim().length > 0) {
        chunks.push({
          source_id: sourceId,
          chunk_index: chunks.length,
          content: chunk.trim(),
          token_count: Math.ceil(chunk.length / 4), // Rough estimate: 4 chars per token
          metadata: {
            source_type: sourceType,
            chunk_method: 'automatic_split',
            created_at: new Date().toISOString()
          }
        });
      }
    }

    // Insert chunks into database
    if (chunks.length > 0) {
      const { error: insertError } = await supabase
        .from('source_chunks')
        .insert(chunks);

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

      console.log(`✅ Created ${chunks.length} chunks for source ${sourceId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksCreated: chunks.length,
        sourceId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error generating chunks:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
