
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

    const { parentSourceId } = await req.json();
    
    if (!parentSourceId) {
      return new Response(
        JSON.stringify({ error: 'parentSourceId is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`🔄 Triggering status aggregation for parent: ${parentSourceId}`);

    // Call the status aggregator function
    const { data, error } = await supabaseClient.functions.invoke('status-aggregator', {
      body: { 
        parentSourceId: parentSourceId,
        eventType: 'manual_trigger'
      }
    });

    if (error) {
      console.error('❌ Error calling status aggregator:', error);
      throw error;
    }

    console.log(`✅ Status aggregation completed for parent: ${parentSourceId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: data,
        message: 'Status aggregation triggered successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in trigger-status-aggregation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': "application/json" },
        status: 500,
      }
    );
  }
});
