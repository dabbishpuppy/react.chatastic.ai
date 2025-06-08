
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { HealthReport } from './types.ts';
import { handleOrphanedPages } from './orphanedPagesHandler.ts';
import { handleStalledJobs } from './stalledJobsHandler.ts';
import { handleStalledPages } from './stalledPagesHandler.ts';
import { handleQueueStatus } from './queueStatusHandler.ts';
import { triggerProcessingIfNeeded } from './processingTrigger.ts';

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

    console.log('🏥 Starting comprehensive health check...');

    const healthReport: HealthReport = {
      healthy: true,
      issues: [],
      actions: [],
      orphanedPages: 0,
      stalledJobs: 0,
      missingJobs: 0,
      queueStatus: 'unknown',
      timestamp: new Date().toISOString()
    };

    // Run all health checks
    await handleOrphanedPages(supabaseClient, healthReport);
    await handleStalledJobs(supabaseClient, healthReport);
    await handleStalledPages(supabaseClient, healthReport);
    await handleQueueStatus(supabaseClient, healthReport);
    await triggerProcessingIfNeeded(supabaseClient, healthReport);

    console.log('🎯 Health check completed:', healthReport);

    return new Response(
      JSON.stringify({
        success: true,
        healthy: healthReport.healthy,
        report: healthReport
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Health monitor error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        healthy: false,
        error: error.message || 'Health check failed',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': "application/json" },
        status: 500,
      }
    );
  }
});
