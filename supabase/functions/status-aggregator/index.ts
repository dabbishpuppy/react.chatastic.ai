
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

    const { parentSourceId, eventType } = await req.json();

    console.log(`📊 Status aggregator triggered for parent: ${parentSourceId}, event: ${eventType}`);

    // Call the aggregate function
    const { data: result, error } = await supabaseClient
      .rpc('aggregate_parent_status', {
        parent_source_id_param: parentSourceId
      });

    if (error) {
      console.error('❌ Error aggregating status:', error);
      throw error;
    }

    console.log(`✅ Status aggregated successfully:`, result);

    return new Response(
      JSON.stringify({
        success: true,
        result: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Status aggregator error:', error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
