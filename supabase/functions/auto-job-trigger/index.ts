
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

    console.log('🔄 Auto job trigger activated');

    // Get the request body (webhook payload from database trigger)
    const payload = await req.json();
    console.log('📋 Trigger payload:', payload);

    // Check if there are pending jobs to process
    const { data: pendingJobs, error: pendingError } = await supabaseClient
      .from('background_jobs')
      .select('id, job_type, source_id')
      .eq('status', 'pending')
      .limit(10);

    if (pendingError) {
      console.error('❌ Error checking pending jobs:', pendingError);
      return new Response(
        JSON.stringify({ error: 'Failed to check pending jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (pendingJobs && pendingJobs.length > 0) {
      console.log(`🚀 Found ${pendingJobs.length} pending jobs, triggering processor...`);
      
      // Invoke the workflow job processor
      const { data, error } = await supabaseClient.functions.invoke('workflow-job-processor', {
        body: { action: 'process_jobs', maxJobs: 50 }
      });

      if (error) {
        console.error('❌ Error invoking job processor:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to invoke job processor' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log('✅ Successfully triggered job processor:', data);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Triggered processing of ${pendingJobs.length} pending jobs`,
          data 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('📭 No pending jobs found');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending jobs to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Auto job trigger error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
