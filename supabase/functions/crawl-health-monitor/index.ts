
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
  performance: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    processingRate: number;
  };
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

    console.log('🏥 Starting high-performance crawl health monitoring check...');

    const healthResult = await performHealthCheck(supabaseClient);
    
    if (!healthResult.healthy) {
      console.log('🚨 Health issues detected, initiating immediate auto-recovery...');
      await performFastRecovery(supabaseClient, healthResult);
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

  // Check for stalled pending jobs (>2 minutes for faster detection)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: pendingJobs, error: pendingError } = await supabaseClient
    .from('source_pages')
    .select('*')
    .eq('status', 'pending')
    .lt('created_at', twoMinutesAgo);

  if (pendingError) {
    console.error('Error checking pending jobs:', pendingError);
  } else if (pendingJobs && pendingJobs.length > 0) {
    stalledJobs = pendingJobs;
    issues.push(`${pendingJobs.length} jobs stalled in pending state`);
    actions.push('Restart processing pipeline immediately');
  }

  // Check for timeout in-progress jobs (>5 minutes for faster recovery)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: inProgressJobs, error: progressError } = await supabaseClient
    .from('source_pages')
    .select('*')
    .eq('status', 'in_progress')
    .lt('started_at', fiveMinutesAgo);

  if (progressError) {
    console.error('Error checking in-progress jobs:', progressError);
  } else if (inProgressJobs && inProgressJobs.length > 0) {
    timeoutJobs = inProgressJobs;
    issues.push(`${inProgressJobs.length} jobs stuck in processing state`);
    actions.push('Reset timeout jobs to pending immediately');
  }

  // Check processing rate and throughput
  const { data: recentJobs, error: recentError } = await supabaseClient
    .from('source_pages')
    .select('status, completed_at')
    .gte('updated_at', fiveMinutesAgo);

  let processingRate = 0;
  if (!recentError && recentJobs) {
    const completedRecently = recentJobs.filter(job => job.status === 'completed').length;
    processingRate = completedRecently / 5; // jobs per minute
    
    if (processingRate < 0.5 && recentJobs.length > 10) { // Less than 0.5 jobs per minute
      issues.push(`Low processing rate: ${processingRate.toFixed(2)} jobs/min`);
      actions.push('Scale up worker capacity');
    }
  }

  // Get overall performance metrics
  const { data: allJobs, error: allJobsError } = await supabaseClient
    .from('source_pages')
    .select('status')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const performance = {
    totalJobs: allJobs?.length || 0,
    completedJobs: allJobs?.filter(j => j.status === 'completed').length || 0,
    failedJobs: allJobs?.filter(j => j.status === 'failed').length || 0,
    processingRate
  };

  const healthy = issues.length === 0;

  console.log(`🏥 High-performance health check complete: ${healthy ? 'HEALTHY' : 'ISSUES DETECTED'}`);
  if (issues.length > 0) {
    console.log('Issues found:', issues);
    console.log('Immediate actions planned:', actions);
  }

  return {
    healthy,
    issues,
    stalledJobs,
    timeoutJobs,
    actions,
    performance
  };
}

async function performFastRecovery(supabaseClient: any, healthResult: HealthCheckResult): Promise<void> {
  console.log('🚀 Starting immediate fast-recovery procedures...');

  // Recovery 1: Immediately reset timeout jobs to pending
  if (healthResult.timeoutJobs.length > 0) {
    console.log(`⚡ Immediately resetting ${healthResult.timeoutJobs.length} timeout jobs...`);
    
    const jobIds = healthResult.timeoutJobs.map(job => job.id);
    const { error } = await supabaseClient
      .from('source_pages')
      .update({
        status: 'pending',
        started_at: null,
        error_message: 'Auto-recovered from timeout (fast recovery)',
        retry_count: supabaseClient.raw('retry_count + 1'),
        updated_at: new Date().toISOString()
      })
      .in('id', jobIds);

    if (error) {
      console.error('❌ Failed to reset timeout jobs:', error);
    } else {
      console.log(`✅ Reset ${healthResult.timeoutJobs.length} timeout jobs`);
    }
  }

  // Recovery 2: Immediately trigger batch processing for stalled jobs
  if (healthResult.stalledJobs.length > 0) {
    console.log(`🚀 Immediately triggering processing for ${healthResult.stalledJobs.length} stalled jobs...`);
    
    // Group by parent source for efficient batch processing
    const parentSources = [...new Set(healthResult.stalledJobs.map(job => job.parent_source_id))];
    
    // Process multiple parent sources concurrently for speed
    const batchPromises = parentSources.map(async (parentSourceId) => {
      try {
        const { error } = await supabaseClient.functions.invoke('process-source-pages', {
          body: { 
            parentSourceId,
            fastRecovery: true,
            batchMode: true,
            priority: 'high'
          }
        });
        
        if (error && !error.message?.includes('409')) {
          console.error(`Failed to trigger processing for ${parentSourceId}:`, error);
        } else {
          console.log(`✅ Fast processing triggered for parent ${parentSourceId}`);
        }
      } catch (error) {
        console.error(`Error in fast recovery for ${parentSourceId}:`, error);
      }
    });

    await Promise.allSettled(batchPromises);
  }

  // Recovery 3: Scale up processing if needed
  if (healthResult.performance.processingRate < 1.0 && healthResult.performance.totalJobs > 100) {
    console.log('📈 Triggering scale-up procedures for low throughput...');
    
    // This could trigger additional worker instances or increase batch sizes
    // For now, we'll trigger multiple processing calls to increase parallelism
    try {
      const scaleUpPromises = Array.from({ length: 3 }, (_, i) => 
        supabaseClient.functions.invoke('process-source-pages', {
          body: { 
            scaleUp: true,
            workerId: `scale-up-${i}`,
            fastRecovery: true
          }
        })
      );

      await Promise.allSettled(scaleUpPromises);
      console.log('✅ Scale-up procedures initiated');
    } catch (error) {
      console.error('❌ Failed to scale up processing:', error);
    }
  }

  console.log('⚡ Fast recovery procedures completed');
}
