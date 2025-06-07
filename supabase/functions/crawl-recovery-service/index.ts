
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecoveryReport {
  orphanedPagesFound: number;
  jobsSpawned: number;
  stalledJobsRecovered: number;
  timeoutJobsReset: number;
  errors: string[];
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

    console.log('🚀 Starting crawl recovery service...');

    const recoveryReport: RecoveryReport = {
      orphanedPagesFound: 0,
      jobsSpawned: 0,
      stalledJobsRecovered: 0,
      timeoutJobsReset: 0,
      errors: [],
      timestamp: new Date().toISOString()
    };

    // Step 1: Find orphaned pending pages (pages without active jobs)
    const { data: orphanedPages, error: orphanedError } = await supabaseClient
      .from('source_pages')
      .select('id, parent_source_id, url, created_at, retry_count')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()); // Older than 2 minutes

    if (orphanedError) {
      console.error('Error finding orphaned pages:', orphanedError);
      recoveryReport.errors.push(`Orphaned pages query failed: ${orphanedError.message}`);
    } else if (orphanedPages && orphanedPages.length > 0) {
      console.log(`🔍 Found ${orphanedPages.length} potentially orphaned pages`);
      recoveryReport.orphanedPagesFound = orphanedPages.length;

      // Process orphaned pages in batches
      const batchSize = 50;
      for (let i = 0; i < orphanedPages.length; i += batchSize) {
        const batch = orphanedPages.slice(i, i + batchSize);
        
        // Check if these pages have active background jobs
        const pageIds = batch.map(p => p.id);
        const { data: existingJobs } = await supabaseClient
          .from('background_jobs')
          .select('page_id')
          .in('page_id', pageIds)
          .in('status', ['pending', 'processing']);

        const existingJobPageIds = new Set(existingJobs?.map(j => j.page_id) || []);
        
        // Find truly orphaned pages (no active jobs)
        const trulyOrphaned = batch.filter(page => !existingJobPageIds.has(page.id));
        
        if (trulyOrphaned.length > 0) {
          console.log(`⚡ Spawning ${trulyOrphaned.length} recovery jobs`);
          
          // Spawn new jobs for orphaned pages
          const jobsToInsert = trulyOrphaned.map(page => ({
            job_type: 'process_page',
            source_id: page.parent_source_id,
            page_id: page.id,
            job_key: `recovery:${page.id}`,
            payload: { 
              url: page.url,
              recovery: true,
              attempt: (page.retry_count || 0) + 1
            },
            priority: 75, // High priority for recovery
            scheduled_at: new Date().toISOString()
          }));

          const { error: insertError } = await supabaseClient
            .from('background_jobs')
            .insert(jobsToInsert);

          if (insertError) {
            console.error('Error inserting recovery jobs:', insertError);
            recoveryReport.errors.push(`Job insertion failed: ${insertError.message}`);
          } else {
            recoveryReport.jobsSpawned += trulyOrphaned.length;
            console.log(`✅ Spawned ${trulyOrphaned.length} recovery jobs`);
          }
        }
      }
    }

    // Step 2: Reset timeout jobs (stuck in processing for too long)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: timeoutJobs, error: timeoutError } = await supabaseClient
      .from('background_jobs')
      .select('id, source_id, page_id')
      .eq('status', 'processing')
      .lt('started_at', fiveMinutesAgo);

    if (timeoutError) {
      console.error('Error finding timeout jobs:', timeoutError);
      recoveryReport.errors.push(`Timeout jobs query failed: ${timeoutError.message}`);
    } else if (timeoutJobs && timeoutJobs.length > 0) {
      console.log(`⏰ Found ${timeoutJobs.length} timeout jobs to reset`);
      
      const { error: resetError } = await supabaseClient
        .from('background_jobs')
        .update({
          status: 'pending',
          started_at: null,
          error_message: 'Reset from timeout by recovery service',
          scheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', timeoutJobs.map(j => j.id));

      if (resetError) {
        console.error('Error resetting timeout jobs:', resetError);
        recoveryReport.errors.push(`Timeout job reset failed: ${resetError.message}`);
      } else {
        recoveryReport.timeoutJobsReset = timeoutJobs.length;
        console.log(`✅ Reset ${timeoutJobs.length} timeout jobs`);
      }
    }

    // Step 3: Find and recover stalled pages (in_progress but no jobs)
    const { data: stalledPages, error: stalledError } = await supabaseClient
      .from('source_pages')
      .select('id, parent_source_id, url, started_at')
      .eq('status', 'in_progress')
      .lt('started_at', fiveMinutesAgo);

    if (stalledError) {
      console.error('Error finding stalled pages:', stalledError);
      recoveryReport.errors.push(`Stalled pages query failed: ${stalledError.message}`);
    } else if (stalledPages && stalledPages.length > 0) {
      console.log(`🔄 Found ${stalledPages.length} stalled pages to recover`);
      
      const { error: recoverError } = await supabaseClient
        .from('source_pages')
        .update({
          status: 'pending',
          started_at: null,
          error_message: 'Recovered from stalled state',
          retry_count: supabaseClient.raw('retry_count + 1'),
          updated_at: new Date().toISOString()
        })
        .in('id', stalledPages.map(p => p.id));

      if (recoverError) {
        console.error('Error recovering stalled pages:', recoverError);
        recoveryReport.errors.push(`Stalled page recovery failed: ${recoverError.message}`);
      } else {
        recoveryReport.stalledJobsRecovered = stalledPages.length;
        console.log(`✅ Recovered ${stalledPages.length} stalled pages`);
      }
    }

    // Step 4: Trigger processing if we spawned new jobs
    if (recoveryReport.jobsSpawned > 0 || recoveryReport.timeoutJobsReset > 0) {
      console.log('🚀 Triggering batch processing for recovered jobs...');
      
      try {
        const { error: triggerError } = await supabaseClient.functions.invoke('process-source-pages', {
          body: { 
            recoveryMode: true,
            batchSize: 100,
            highPriority: true
          }
        });

        if (triggerError && !triggerError.message?.includes('409')) {
          console.error('Error triggering processing:', triggerError);
          recoveryReport.errors.push(`Processing trigger failed: ${triggerError.message}`);
        } else {
          console.log('✅ Processing triggered successfully');
        }
      } catch (error) {
        console.error('Error triggering processing:', error);
        recoveryReport.errors.push(`Processing trigger exception: ${error.message}`);
      }
    }

    console.log('🎯 Recovery service completed:', recoveryReport);

    return new Response(
      JSON.stringify({
        success: true,
        report: recoveryReport
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Recovery service error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Recovery service failed',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': "application/json" },
        status: 500,
      }
    );
  }
});
