
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  healthy: boolean;
  issues: string[];
  stalledJobs: any[];
  timeoutJobs: any[];
  actions: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🏥 Starting crawl health monitoring check...');

    const healthResult = await performHealthCheck(supabaseClient);
    
    if (!healthResult.healthy) {
      console.log('🚨 Health issues detected, initiating auto-recovery...');
      await performAutoRecovery(supabaseClient, healthResult);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        ...healthResult
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
        error: error.message || 'Health monitor failed',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': "application/json" },
        status: 500,
      }
    );
  }
});

async function performHealthCheck(supabaseClient: any): Promise<HealthCheckResult> {
  const issues: string[] = [];
  const actions: string[] = [];
  let stalledJobs: any[] = [];
  let timeoutJobs: any[] = [];

  // Check for stalled pending jobs (>5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: pendingJobs, error: pendingError } = await supabaseClient
    .from('source_pages')
    .select('*')
    .eq('status', 'pending')
    .lt('created_at', fiveMinutesAgo);

  if (pendingError) {
    console.error('Error checking pending jobs:', pendingError);
  } else if (pendingJobs && pendingJobs.length > 0) {
    stalledJobs = pendingJobs;
    issues.push(`${pendingJobs.length} jobs stalled in pending state`);
    actions.push('Restart processing pipeline');
  }

  // Check for timeout in-progress jobs (>10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: inProgressJobs, error: progressError } = await supabaseClient
    .from('source_pages')
    .select('*')
    .eq('status', 'processing')
    .lt('started_at', tenMinutesAgo);

  if (progressError) {
    console.error('Error checking in-progress jobs:', progressError);
  } else if (inProgressJobs && inProgressJobs.length > 0) {
    timeoutJobs = inProgressJobs;
    issues.push(`${inProgressJobs.length} jobs stuck in processing state`);
    actions.push('Reset timeout jobs to pending');
  }

  // Check for excessive error rates
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentJobs, error: recentError } = await supabaseClient
    .from('source_pages')
    .select('status')
    .gte('updated_at', oneHourAgo);

  if (!recentError && recentJobs && recentJobs.length > 10) {
    const failedCount = recentJobs.filter(job => job.status === 'failed').length;
    const errorRate = failedCount / recentJobs.length;
    
    if (errorRate > 0.3) { // >30% error rate
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      actions.push('Investigate error patterns');
    }
  }

  const healthy = issues.length === 0;

  console.log(`🏥 Health check complete: ${healthy ? 'HEALTHY' : 'ISSUES DETECTED'}`);
  if (issues.length > 0) {
    console.log('Issues found:', issues);
  }

  return {
    healthy,
    issues,
    stalledJobs,
    timeoutJobs,
    actions
  };
}

async function performAutoRecovery(supabaseClient: any, healthResult: HealthCheckResult): Promise<void> {
  console.log('🔧 Starting auto-recovery procedures...');

  // Recovery 1: Reset timeout jobs to pending
  if (healthResult.timeoutJobs.length > 0) {
    console.log(`🔄 Resetting ${healthResult.timeoutJobs.length} timeout jobs to pending...`);
    
    for (const job of healthResult.timeoutJobs) {
      const { error } = await supabaseClient
        .from('source_pages')
        .update({
          status: 'pending',
          started_at: null,
          error_message: 'Auto-recovered from timeout',
          retry_count: (job.retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (error) {
        console.error(`Failed to reset job ${job.id}:`, error);
      }
    }
  }

  // Recovery 2: Trigger processing for stalled jobs
  if (healthResult.stalledJobs.length > 0) {
    console.log(`🚀 Triggering processing for ${healthResult.stalledJobs.length} stalled jobs...`);
    
    // Group by parent source to trigger processing efficiently
    const parentSources = [...new Set(healthResult.stalledJobs.map(job => job.parent_source_id))];
    
    for (const parentSourceId of parentSources) {
      try {
        const { error } = await supabaseClient.functions.invoke('process-source-pages', {
          body: { parentSourceId }
        });
        
        if (error && !error.message?.includes('409')) {
          console.error(`Failed to trigger processing for ${parentSourceId}:`, error);
        } else {
          console.log(`✅ Triggered processing for parent ${parentSourceId}`);
        }
      } catch (error) {
        console.error(`Error triggering processing for ${parentSourceId}:`, error);
      }
    }
  }

  // Recovery 3: Alert if too many failures
  if (healthResult.issues.some(issue => issue.includes('High error rate'))) {
    console.log('🚨 High error rate detected - logging for investigation');
    
    // In production, this would send alerts to operators
    // For now, we log detailed error information
    const { data: errorJobs } = await supabaseClient
      .from('source_pages')
      .select('id, url, error_message, retry_count')
      .eq('status', 'failed')
      .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(10);

    if (errorJobs && errorJobs.length > 0) {
      console.log('Recent error patterns:', errorJobs);
    }
  }

  console.log('✅ Auto-recovery procedures completed');
}
