
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
  private readonly MAX_CONCURRENT_JOBS = 100; // Increased for better throughput
  private readonly BATCH_SIZE = 25; // Optimized batch size
  private readonly PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async processQueue(): Promise<QueueMetrics> {
    console.log('🚀 Starting production queue processing...');

    // Get pending jobs with proper prioritization
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

    // Process jobs in optimized batches with better error isolation
    const batches = this.createOptimizedBatches(pendingJobs);
    const processingPromises = batches.map(batch => this.processBatchWithRetry(batch));

    // Process all batches with comprehensive error handling
    const results = await Promise.allSettled(processingPromises);
    
    // Log detailed batch results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ Batch ${index} failed:`, result.reason);
      } else {
        console.log(`✅ Batch ${index} completed:`, result.value);
      }
    });

    return this.getQueueMetrics();
  }

  private createOptimizedBatches(jobs: any[]): any[][] {
    const batches: any[][] = [];
    
    // Group jobs by source for better cache locality and processing efficiency
    const jobsBySource = new Map<string, any[]>();
    
    jobs.forEach(job => {
      const sourceId = job.source_id || 'unknown';
      if (!jobsBySource.has(sourceId)) {
        jobsBySource.set(sourceId, []);
      }
      jobsBySource.get(sourceId)!.push(job);
    });

    // Create balanced batches ensuring good distribution
    let currentBatch: any[] = [];
    
    for (const [sourceId, sourceJobs] of jobsBySource) {
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

    console.log(`📦 Created ${batches.length} optimized batches (max ${this.BATCH_SIZE} jobs each)`);
    return batches;
  }

  private async processBatchWithRetry(jobs: any[]): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    console.log(`🔄 Processing batch of ${jobs.length} jobs`);

    // Process each job with comprehensive error handling and retries
    for (const job of jobs) {
      let attempts = 0;
      let success = false;

      while (attempts < this.MAX_RETRIES && !success) {
        try {
          success = await this.processIndividualJobSafely(job);
          if (success) {
            processed++;
          } else if (attempts === this.MAX_RETRIES - 1) {
            await this.handleJobFailure(job, new Error('Max processing attempts exceeded'));
            failed++;
          }
        } catch (error) {
          console.error(`❌ Job ${job.id} attempt ${attempts + 1} failed:`, error);
          
          if (attempts === this.MAX_RETRIES - 1) {
            await this.handleJobFailure(job, error);
            failed++;
          } else {
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          }
        }
        attempts++;
      }
    }

    console.log(`✅ Batch completed: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  }

  private async processIndividualJobSafely(job: any): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Step 1: Claim the job atomically with enhanced conflict resolution
      const claimed = await this.claimJobAtomically(job.id);
      if (!claimed) {
        console.log(`⚠️ Job ${job.id} already claimed by another worker`);
        return false; // Not an error, just already processed
      }

      console.log(`🔒 Successfully claimed job ${job.id} (${job.job_type})`);

      // Step 2: Process the job with timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job processing timeout')), this.PROCESSING_TIMEOUT_MS);
      });

      const processingPromise = this.processIndividualJob(job);
      await Promise.race([processingPromise, timeoutPromise]);

      // Step 3: Mark as completed
      await this.markJobCompleted(job.id, startTime);
      
      return true;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Job ${job.id} failed after ${processingTime}ms:`, error);
      throw error;
    }
  }

  private async claimJobAtomically(jobId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('background_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'pending') // Only claim if still pending
        .select();

      if (error) {
        console.error('Error claiming job:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Failed to claim job atomically:', error);
      return false;
    }
  }

  private async processIndividualJob(job: any): Promise<void> {
    // Dispatch based on job type with proper parameter handling
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
  }

  private async processPageJob(job: any): Promise<void> {
    // FIXED: Send correct parameter name 'childJobId' with proper payload structure
    const payload = {
      childJobId: job.page_id, // This is the correct parameter name expected by child-job-processor
      url: job.payload?.url || '',
      parentSourceId: job.source_id,
      teamId: job.payload?.teamId,
      recovery: job.payload?.recovery || false
    };

    console.log(`📄 Processing page job ${job.id} with payload:`, payload);

    if (!payload.childJobId) {
      throw new Error(`Missing page_id for process_page job ${job.id}`);
    }

    const { error } = await this.supabase.functions.invoke('child-job-processor', {
      body: payload
    });

    if (error) {
      console.error(`Child job processor error for job ${job.id}:`, error);
      throw new Error(`Child job processor failed: ${error.message}`);
    }

    console.log(`✅ Page job ${job.id} processed successfully`);
  }

  private async processCrawlJob(job: any): Promise<void> {
    console.log(`🕷️ Processing crawl job ${job.id}`);
    
    // Validate required payload
    if (!job.payload || !job.source_id) {
      throw new Error(`Missing required data for crawl job ${job.id}`);
    }

    // Trigger enhanced crawl for source
    const { error } = await this.supabase.functions.invoke('enhanced-crawl-website', {
      body: {
        ...job.payload,
        sourceId: job.source_id
      }
    });

    if (error) {
      console.error(`Enhanced crawl error for job ${job.id}:`, error);
      throw new Error(`Enhanced crawl failed: ${error.message}`);
    }

    console.log(`✅ Crawl job ${job.id} processed successfully`);
  }

  private async processTrainingJob(job: any): Promise<void> {
    console.log(`🎓 Processing training job ${job.id} for source: ${job.source_id}`);
    
    // Validate required data
    if (!job.source_id) {
      throw new Error(`Missing source_id for training job ${job.id}`);
    }

    // Simulate training processing (replace with actual training service call)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`✅ Training job ${job.id} processed successfully`);
  }

  private async markJobCompleted(jobId: string, startTime: number): Promise<void> {
    const processingTime = Date.now() - startTime;
    
    const { error } = await this.supabase
      .from('background_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error marking job as completed:', error);
      throw error;
    }

    console.log(`✅ Job ${jobId} marked as completed (${processingTime}ms)`);
  }

  private async handleJobFailure(job: any, error: any): Promise<void> {
    const newAttempts = (job.attempts || 0) + 1;
    const maxAttempts = job.max_attempts || 3;

    console.log(`🔄 Handling failure for job ${job.id} (attempt ${newAttempts}/${maxAttempts})`);

    if (newAttempts >= maxAttempts) {
      // Move to failed state
      await this.supabase
        .from('background_jobs')
        .update({
          status: 'failed',
          error_message: `Max attempts reached: ${error.message}`,
          attempts: newAttempts,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
        
      console.log(`💀 Job ${job.id} moved to failed state after ${newAttempts} attempts`);
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, newAttempts) * 5000; // 5s, 10s, 20s...
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

      console.log(`🔄 Job ${job.id} scheduled for retry in ${retryDelay}ms (attempt ${newAttempts})`);
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
    const failed = metrics.filter(m => m.status === 'failed').length;

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
    const totalJobs = pending + processing + completed + failed;
    const failureRate = totalJobs > 0 ? failed / totalJobs : 0;
    
    if (pending > 500 || failureRate > 0.2) {
      queueHealth = 'critical';
    } else if (pending > 100 || failureRate > 0.1) {
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
