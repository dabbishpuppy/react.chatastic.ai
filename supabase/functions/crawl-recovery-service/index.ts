
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

class CrawlRecoveryService {
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async executeRecovery(): Promise<any> {
    console.log('🔧 Starting crawl recovery service...');
    
    const startTime = Date.now();
    const report = {
      orphanedPagesFound: 0,
      jobsSpawned: 0,
      stalledJobsRecovered: 0,
      failedJobsRetried: 0,
      deadLocksBroken: 0,
      timestamp: new Date().toISOString()
    };

    try {
      // Step 1: Find and recover stalled jobs
      report.stalledJobsRecovered = await this.recoverStalledJobs();
      
      // Step 2: Find orphaned pages and create jobs for them
      report.orphanedPagesFound = await this.findOrphanedPages();
      
      // Step 3: Retry failed jobs that are eligible for retry
      report.failedJobsRetried = await this.retryEligibleFailedJobs();
      
      // Step 4: Break deadlocks in job processing
      report.deadLocksBroken = await this.breakJobDeadlocks();
      
      // Step 5: Trigger aggregation for parent sources
      await this.triggerParentAggregation();

      const executionTime = Date.now() - startTime;
      console.log(`✅ Recovery completed in ${executionTime}ms:`, report);

      return {
        success: true,
        report,
        executionTime
      };

    } catch (error) {
      console.error('❌ Recovery service failed:', error);
      throw error;
    }
  }

  private async recoverStalledJobs(): Promise<number> {
    console.log('🔍 Looking for stalled jobs...');
    
    // Find jobs that have been "in_progress" for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stalledJobs, error } = await this.supabase
      .from('source_pages')
      .select('id, url, started_at, retry_count')
      .eq('status', 'in_progress')
      .lt('started_at', fiveMinutesAgo);

    if (error) {
      console.error('Error finding stalled jobs:', error);
      return 0;
    }

    if (!stalledJobs || stalledJobs.length === 0) {
      console.log('📊 No stalled jobs found');
      return 0;
    }

    console.log(`🔧 Found ${stalledJobs.length} stalled jobs, resetting them...`);

    // Reset stalled jobs to pending status
    const stalledJobIds = stalledJobs.map(job => job.id);
    
    const { error: resetError } = await this.supabase
      .from('source_pages')
      .update({
        status: 'pending',
        started_at: null,
        error_message: 'Reset by recovery service - job was stalled',
        updated_at: new Date().toISOString()
      })
      .in('id', stalledJobIds);

    if (resetError) {
      console.error('Error resetting stalled jobs:', error);
      return 0;
    }

    console.log(`✅ Reset ${stalledJobs.length} stalled jobs to pending`);
    return stalledJobs.length;
  }

  private async findOrphanedPages(): Promise<number> {
    console.log('🔍 Looking for orphaned pages...');
    
    // Find parent sources that are "in_progress" but have no pending or in_progress children
    const { data: parentSources, error } = await this.supabase
      .from('agent_sources')
      .select(`
        id,
        url,
        crawl_status,
        discovery_completed
      `)
      .eq('source_type', 'website')
      .eq('crawl_status', 'in_progress')
      .is('parent_source_id', null);

    if (error) {
      console.error('Error finding parent sources:', error);
      return 0;
    }

    let orphanedCount = 0;

    for (const parent of parentSources || []) {
      // Check if this parent has any active children
      const { count: activeChildren } = await this.supabase
        .from('source_pages')
        .select('*', { count: 'exact', head: true })
        .eq('parent_source_id', parent.id)
        .in('status', ['pending', 'in_progress']);

      // If no active children but discovery is completed, this might be orphaned
      if (activeChildren === 0 && parent.discovery_completed) {
        console.log(`🔧 Found potentially orphaned parent: ${parent.id}`);
        
        // Check if we need to create a job for the parent URL itself
        const { count: existingPage } = await this.supabase
          .from('source_pages')
          .select('*', { count: 'exact', head: true })
          .eq('parent_source_id', parent.id)
          .eq('url', parent.url);

        if (existingPage === 0) {
          // Create a job for the parent URL
          const { error: insertError } = await this.supabase
            .from('source_pages')
            .insert({
              parent_source_id: parent.id,
              url: parent.url,
              status: 'pending',
              priority: 'high',
              created_at: new Date().toISOString()
            });

          if (!insertError) {
            orphanedCount++;
            console.log(`✅ Created job for orphaned parent URL: ${parent.url}`);
          }
        }
      }
    }

    return orphanedCount;
  }

  private async retryEligibleFailedJobs(): Promise<number> {
    console.log('🔍 Looking for failed jobs eligible for retry...');
    
    // Find failed jobs that haven't exceeded retry limit
    const { data: failedJobs, error } = await this.supabase
      .from('source_pages')
      .select('id, url, retry_count, error_message')
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .limit(100); // Limit to avoid overwhelming the system

    if (error) {
      console.error('Error finding failed jobs:', error);
      return 0;
    }

    if (!failedJobs || failedJobs.length === 0) {
      console.log('📊 No failed jobs eligible for retry');
      return 0;
    }

    console.log(`🔄 Found ${failedJobs.length} failed jobs to retry`);

    // Reset eligible failed jobs to pending
    const failedJobIds = failedJobs.map(job => job.id);
    
    const { error: retryError } = await this.supabase
      .from('source_pages')
      .update({
        status: 'pending',
        started_at: null,
        completed_at: null,
        error_message: null,
        updated_at: new Date().toISOString(),
        retry_count: this.supabase.raw('retry_count + 1')
      })
      .in('id', failedJobIds);

    if (retryError) {
      console.error('Error retrying failed jobs:', retryError);
      return 0;
    }

    console.log(`✅ Reset ${failedJobs.length} failed jobs for retry`);
    return failedJobs.length;
  }

  private async breakJobDeadlocks(): Promise<number> {
    console.log('🔍 Looking for job deadlocks...');
    
    // Find jobs that have been pending for more than 30 minutes
    // This might indicate a deadlock or system issue
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: oldPendingJobs, error } = await this.supabase
      .from('source_pages')
      .select('id, url, created_at, parent_source_id')
      .eq('status', 'pending')
      .lt('created_at', thirtyMinutesAgo)
      .limit(50);

    if (error) {
      console.error('Error finding old pending jobs:', error);
      return 0;
    }

    if (!oldPendingJobs || oldPendingJobs.length === 0) {
      console.log('📊 No old pending jobs found');
      return 0;
    }

    console.log(`🔧 Found ${oldPendingJobs.length} old pending jobs, refreshing them...`);

    // "Refresh" these jobs by updating their timestamp
    const oldJobIds = oldPendingJobs.map(job => job.id);
    
    const { error: refreshError } = await this.supabase
      .from('source_pages')
      .update({
        updated_at: new Date().toISOString(),
        priority: 'high' // Give them higher priority
      })
      .in('id', oldJobIds);

    if (refreshError) {
      console.error('Error refreshing old jobs:', refreshError);
      return 0;
    }

    console.log(`✅ Refreshed ${oldPendingJobs.length} old pending jobs`);
    return oldPendingJobs.length;
  }

  private async triggerParentAggregation(): Promise<void> {
    console.log('🔧 Triggering parent source aggregation...');
    
    // Find parent sources that might need status updates
    const { data: parentSources, error } = await this.supabase
      .from('agent_sources')
      .select('id')
      .eq('source_type', 'website')
      .is('parent_source_id', null)
      .in('crawl_status', ['in_progress', 'pending'])
      .limit(20);

    if (error) {
      console.error('Error finding parent sources for aggregation:', error);
      return;
    }

    if (!parentSources || parentSources.length === 0) {
      console.log('📊 No parent sources need aggregation');
      return;
    }

    // Trigger aggregation for each parent
    for (const parent of parentSources) {
      try {
        await this.supabase.rpc('aggregate_parent_status', {
          parent_id: parent.id
        });
      } catch (error) {
        console.error(`Failed to aggregate parent ${parent.id}:`, error);
      }
    }

    console.log(`✅ Triggered aggregation for ${parentSources.length} parent sources`);
  }

  async getRecoveryStatus(): Promise<any> {
    // Get current system state for recovery analysis
    const { data: systemState, error } = await this.supabase
      .from('source_pages')
      .select('status')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      return { error: error.message };
    }

    const statusCounts = systemState?.reduce((acc: any, page: any) => {
      acc[page.status] = (acc[page.status] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      systemState: statusCounts,
      needsRecovery: (statusCounts.failed || 0) > 0 || (statusCounts.in_progress || 0) > 20,
      timestamp: new Date().toISOString()
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const recoveryService = new CrawlRecoveryService(supabase);

    if (req.method === 'POST') {
      const result = await recoveryService.executeRecovery();
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET') {
      const status = await recoveryService.getRecoveryStatus();
      
      return new Response(JSON.stringify({
        status: 'healthy',
        recovery: status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405 })

  } catch (error) {
    console.error('Error in crawl-recovery-service:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
