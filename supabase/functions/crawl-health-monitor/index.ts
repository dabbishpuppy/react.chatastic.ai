
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthReport {
  healthy: boolean;
  issues: string[];
  actions: string[];
  orphanedPages: number;
  stalledJobs: number;
  missingJobs: number;
  queueStatus: string;
  timestamp: string;
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

    // 1. Check for orphaned pending pages (no background jobs)
    const { data: orphanedPages, error: orphanedError } = await supabaseClient
      .from('source_pages')
      .select('id, parent_source_id, url, created_at')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()); // Older than 2 minutes

    if (!orphanedError && orphanedPages) {
      // Check which ones actually lack background jobs
      const pageIds = orphanedPages.map(p => p.id);
      const { data: existingJobs } = await supabaseClient
        .from('background_jobs')
        .select('page_id')
        .in('page_id', pageIds)
        .in('status', ['pending', 'processing']);

      const existingJobPageIds = new Set(existingJobs?.map(j => j.page_id) || []);
      const trulyOrphaned = orphanedPages.filter(page => !existingJobPageIds.has(page.id));

      if (trulyOrphaned.length > 0) {
        healthReport.healthy = false;
        healthReport.issues.push(`${trulyOrphaned.length} pending pages without background jobs`);
        healthReport.orphanedPages = trulyOrphaned.length;

        // Auto-create missing jobs
        const jobsToCreate = trulyOrphaned.map(page => ({
          job_type: 'process_page',
          source_id: page.parent_source_id,
          page_id: page.id,
          job_key: `recovery:${page.id}:${Date.now()}`,
          payload: { 
            childJobId: page.id,
            url: page.url,
            recovery: true 
          },
          priority: 80,
          scheduled_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabaseClient
          .from('background_jobs')
          .insert(jobsToCreate);

        if (!insertError) {
          healthReport.actions.push(`Created ${trulyOrphaned.length} recovery jobs for orphaned pages`);
          console.log(`✅ Created ${trulyOrphaned.length} recovery jobs`);
        } else {
          console.error('❌ Failed to create recovery jobs:', insertError);
        }
      }
    }

    // 2. Check for stalled jobs (processing too long)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: stalledJobs, error: stalledError } = await supabaseClient
      .from('background_jobs')
      .select('id, page_id, started_at')
      .eq('status', 'processing')
      .lt('started_at', fiveMinutesAgo);

    if (!stalledError && stalledJobs && stalledJobs.length > 0) {
      healthReport.healthy = false;
      healthReport.issues.push(`${stalledJobs.length} jobs processing for over 5 minutes`);
      healthReport.stalledJobs = stalledJobs.length;

      // Reset stalled jobs
      const { error: resetError } = await supabaseClient
        .from('background_jobs')
        .update({
          status: 'pending',
          started_at: null,
          error_message: 'Reset from stalled state by health monitor',
          scheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', stalledJobs.map(j => j.id));

      if (!resetError) {
        healthReport.actions.push(`Reset ${stalledJobs.length} stalled jobs to pending`);
        console.log(`✅ Reset ${stalledJobs.length} stalled jobs`);
      }
    }

    // 3. Check for stalled source pages
    const { data: stalledPages, error: stalledPagesError } = await supabaseClient
      .from('source_pages')
      .select('id, parent_source_id, url')
      .eq('status', 'in_progress')
      .lt('started_at', fiveMinutesAgo);

    if (!stalledPagesError && stalledPages && stalledPages.length > 0) {
      healthReport.healthy = false;
      healthReport.issues.push(`${stalledPages.length} pages stuck in processing`);

      // Reset stalled pages
      const { error: resetPagesError } = await supabaseClient
        .from('source_pages')
        .update({
          status: 'pending',
          started_at: null,
          retry_count: supabaseClient.raw('COALESCE(retry_count, 0) + 1'),
          updated_at: new Date().toISOString()
        })
        .in('id', stalledPages.map(p => p.id));

      if (!resetPagesError) {
        healthReport.actions.push(`Reset ${stalledPages.length} stalled pages to pending`);
      }
    }

    // 4. Check queue status
    const { data: queueStats } = await supabaseClient
      .from('background_jobs')
      .select('status')
      .in('status', ['pending', 'processing']);

    const pendingJobs = queueStats?.filter(j => j.status === 'pending').length || 0;
    const processingJobs = queueStats?.filter(j => j.status === 'processing').length || 0;

    if (pendingJobs > 500) {
      healthReport.healthy = false;
      healthReport.issues.push(`High queue backlog: ${pendingJobs} pending jobs`);
      healthReport.queueStatus = 'overloaded';
    } else if (pendingJobs > 100) {
      healthReport.queueStatus = 'busy';
    } else {
      healthReport.queueStatus = 'normal';
    }

    // 5. Trigger processing if we fixed issues
    if (healthReport.actions.length > 0) {
      try {
        const { error: triggerError } = await supabaseClient.functions.invoke('production-queue-manager', {
          body: { healthRecovery: true, priority: 'high' }
        });

        if (!triggerError) {
          healthReport.actions.push('Triggered queue processing for recovered jobs');
        }
      } catch (error) {
        console.error('Failed to trigger processing:', error);
      }
    }

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
