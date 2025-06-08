
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueMetrics {
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  queueHealth: 'healthy' | 'degraded' | 'critical';
  throughput: number;
  avgProcessingTime: number;
}

class ProductionQueueProcessor {
  private supabase: any;
  private readonly MAX_CONCURRENT_JOBS = 2000; // Support 2000 simultaneous URLs
  private readonly BATCH_SIZE = 100;
  private readonly PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async processQueue(): Promise<QueueMetrics> {
    console.log('🚀 Starting production queue processing...');

    // Get pending jobs with high concurrency support
    const { data: pendingJobs, error: jobsError } = await this.supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(this.MAX_CONCURRENT_JOBS);

    if (jobsError) {
      console.error('Error fetching pending jobs:', jobsError);
      throw jobsError;
    }

    console.log(`📋 Found ${pendingJobs?.length || 0} pending jobs to process`);

    if (!pendingJobs || pendingJobs.length === 0) {
      return this.getQueueMetrics();
    }

    // Process jobs in optimized batches
    const batches = this.createOptimizedBatches(pendingJobs);
    const processingPromises = batches.map(batch => this.processBatch(batch));

    // Process all batches concurrently for maximum throughput
    const results = await Promise.allSettled(processingPromises);
    
    // Log batch results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Batch ${index} failed:`, result.reason);
      } else {
        console.log(`Batch ${index} completed:`, result.value);
      }
    });

    return this.getQueueMetrics();
  }

  private createOptimizedBatches(jobs: any[]): any[][] {
    const batches: any[][] = [];
    
    // Group jobs by source for better cache locality
    const jobsBySource = new Map<string, any[]>();
    
    jobs.forEach(job => {
      const sourceId = job.source_id;
      if (!jobsBySource.has(sourceId)) {
        jobsBySource.set(sourceId, []);
      }
      jobsBySource.get(sourceId)!.push(job);
    });

    // Create batches ensuring good distribution
    let currentBatch: any[] = [];
    
    for (const [sourceId, sourceJobs] of jobsBySource) {
      // Add jobs from this source to current batch
      for (const job of sourceJobs) {
        currentBatch.push(job);
        
        if (currentBatch.length >= this.BATCH_SIZE) {
          batches.push([...currentBatch]);
          currentBatch = [];
        }
      }
    }
    
    // Add remaining jobs
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    console.log(`📦 Created ${batches.length} optimized batches`);
    return batches;
  }

  private async processBatch(jobs: any[]): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    // Claim all jobs in this batch atomically
    const jobIds = jobs.map(job => job.id);
    
    const { data: claimedJobs, error: claimError } = await this.supabase
      .from('background_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', jobIds)
      .eq('status', 'pending')
      .select();

    if (claimError) {
      console.error('Error claiming batch jobs:', claimError);
      return { processed: 0, failed: jobs.length };
    }

    const actuallyClaimedIds = new Set(claimedJobs?.map(j => j.id) || []);
    const successfullyClaimed = jobs.filter(job => actuallyClaimedIds.has(job.id));

    console.log(`🔒 Claimed ${successfullyClaimed.length}/${jobs.length} jobs in batch`);

    // Process each claimed job
    for (const job of successfullyClaimed) {
      try {
        await this.processIndividualJob(job);
        processed++;
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        await this.handleJobFailure(job, error);
        failed++;
      }
    }

    return { processed, failed };
  }

  private async processIndividualJob(job: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Dispatch based on job type
      switch (job.job_type) {
        case 'process_page':
          await this.processPageJob(job);
          break;
        case 'crawl_pages':
          await this.processCrawlJob(job);
          break;
        case 'train_pages':
          await this.processTrainingJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Mark job as completed
      await this.supabase
        .from('background_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Job ${job.id} completed in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Job ${job.id} failed after ${processingTime}ms:`, error);
      throw error;
    }
  }

  private async processPageJob(job: any): Promise<void> {
    // Call the existing child job processor for page processing
    const { error } = await this.supabase.functions.invoke('child-job-processor', {
      body: { 
        jobId: job.id,
        pageId: job.page_id,
        priority: 'high'
      }
    });

    if (error) {
      throw new Error(`Child job processor failed: ${error.message}`);
    }
  }

  private async processCrawlJob(job: any): Promise<void> {
    // Trigger enhanced crawl for source
    const { error } = await this.supabase.functions.invoke('enhanced-crawl-website', {
      body: job.payload
    });

    if (error) {
      throw new Error(`Enhanced crawl failed: ${error.message}`);
    }
  }

  private async processTrainingJob(job: any): Promise<void> {
    // Process training job (placeholder for actual training logic)
    console.log(`🎓 Processing training job for source: ${job.source_id}`);
    
    // This would call your actual training service
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate training
  }

  private async handleJobFailure(job: any, error: any): Promise<void> {
    const newAttempts = job.attempts + 1;
    const maxAttempts = job.max_attempts || 3;

    if (newAttempts >= maxAttempts) {
      // Move to dead letter queue
      await this.supabase
        .from('background_jobs')
        .update({
          status: 'dead_letter',
          error_message: `Max attempts reached: ${error.message}`,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, newAttempts) * 1000;
      const scheduledAt = new Date(Date.now() + retryDelay).toISOString();
      
      await this.supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          attempts: newAttempts,
          scheduled_at: scheduledAt,
          error_message: error.message,
          started_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
    }
  }

  private async getQueueMetrics(): Promise<QueueMetrics> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: metrics, error } = await this.supabase
      .from('background_jobs')
      .select('status, created_at, started_at, completed_at')
      .gte('created_at', oneHourAgo);

    if (error) {
      console.error('Error fetching metrics:', error);
      return {
        pendingJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        queueHealth: 'critical',
        throughput: 0,
        avgProcessingTime: 0
      };
    }

    const pending = metrics.filter(m => m.status === 'pending').length;
    const processing = metrics.filter(m => m.status === 'processing').length;
    const completed = metrics.filter(m => m.status === 'completed').length;
    const failed = metrics.filter(m => m.status === 'failed' || m.status === 'dead_letter').length;

    // Calculate throughput (completed jobs per hour)
    const throughput = completed;

    // Calculate average processing time
    const completedWithTimes = metrics.filter(m => 
      m.status === 'completed' && m.started_at && m.completed_at
    );
    
    const avgProcessingTime = completedWithTimes.length > 0 
      ? completedWithTimes.reduce((sum, m) => {
          const start = new Date(m.started_at).getTime();
          const end = new Date(m.completed_at).getTime();
          return sum + (end - start);
        }, 0) / completedWithTimes.length
      : 0;

    // Determine queue health
    let queueHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const failureRate = failed / (completed + failed || 1);
    
    if (pending > 1000 || failureRate > 0.1) {
      queueHealth = 'critical';
    } else if (pending > 500 || failureRate > 0.05) {
      queueHealth = 'degraded';
    }

    return {
      pendingJobs: pending,
      processingJobs: processing,
      completedJobs: completed,
      failedJobs: failed,
      queueHealth,
      throughput,
      avgProcessingTime
    };
  }
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

    const processor = new ProductionQueueProcessor(supabaseClient);
    const metrics = await processor.processQueue();

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Production queue manager error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Queue processing failed',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': "application/json" },
        status: 500,
      }
    );
  }
});
