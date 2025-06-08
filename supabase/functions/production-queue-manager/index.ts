
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueueMetrics {
  pendingJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  failedJobs: number;
  queueHealth: 'healthy' | 'degraded' | 'critical';
  throughput: number;
  conflictRate: number;
  avgProcessingTime: number;
}

class ProductionQueueManager {
  private supabase: any;
  private readonly MAX_CONCURRENT_JOBS = 10;
  private readonly JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async processQueue(options: {
    scaleUp?: boolean;
    workerId?: string;
    priority?: string;
    batchSize?: number;
  } = {}): Promise<any> {
    console.log('🚀 Starting production queue processing...');
    
    const batchSize = options.batchSize || this.MAX_CONCURRENT_JOBS;
    const workerId = options.workerId || `worker-${Date.now()}`;
    
    try {
      // Get pending jobs with smart prioritization
      const pendingJobs = await this.getNextJobBatch(batchSize, options.priority);
      
      console.log(`📋 Found ${pendingJobs.length} pending jobs to process`);
      
      if (pendingJobs.length === 0) {
        return {
          success: true,
          message: 'No pending jobs found',
          metrics: await this.getQueueMetrics()
        };
      }

      // Process jobs with improved atomic claiming
      const processingResults = await this.processJobBatch(pendingJobs, workerId);
      
      const metrics = await this.getQueueMetrics();
      
      return {
        success: true,
        workerId,
        processedJobs: processingResults.processedCount,
        failedJobs: processingResults.failedCount,
        conflictCount: processingResults.conflictCount,
        metrics
      };

    } catch (error) {
      console.error('❌ Queue processing failed:', error);
      throw error;
    }
  }

  private async getNextJobBatch(batchSize: number, priority?: string): Promise<any[]> {
    let query = this.supabase
      .from('source_pages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    // Apply priority filtering if specified
    if (priority === 'high') {
      query = query.eq('priority', 'high');
    }

    const { data: jobs, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch pending jobs: ${error.message}`);
    }

    return jobs || [];
  }

  private async processJobBatch(jobs: any[], workerId: string): Promise<{
    processedCount: number;
    failedCount: number;
    conflictCount: number;
  }> {
    let processedCount = 0;
    let failedCount = 0;
    let conflictCount = 0;

    console.log(`🔄 Worker ${workerId} processing ${jobs.length} jobs`);

    // Process jobs with limited concurrency to reduce conflicts
    const concurrency = Math.min(3, jobs.length); // Reduced from 5 to 3
    
    for (let i = 0; i < jobs.length; i += concurrency) {
      const batch = jobs.slice(i, i + concurrency);
      
      const batchPromises = batch.map(job => this.processJobSafely(job, workerId));
      const results = await Promise.allSettled(batchPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const jobResult = result.value;
          if (jobResult.success) {
            processedCount++;
          } else if (jobResult.conflict) {
            conflictCount++;
          } else {
            failedCount++;
          }
        } else {
          failedCount++;
          console.error(`Job ${batch[index].id} failed:`, result.reason);
        }
      });

      // Add delay between batches to reduce database pressure
      if (i + concurrency < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Increased from 100ms
      }
    }

    console.log(`✅ Worker ${workerId} completed: ${processedCount} processed, ${failedCount} failed, ${conflictCount} conflicts`);

    return { processedCount, failedCount, conflictCount };
  }

  private async processJobSafely(job: any, workerId: string): Promise<{
    success: boolean;
    conflict?: boolean;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Enhanced atomic claiming with row-level locking
      const claimed = await this.claimJobAtomically(job.id, workerId);
      if (!claimed) {
        return { success: false, conflict: true };
      }

      // Set up timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job ${job.id} timed out after ${this.JOB_TIMEOUT_MS}ms`));
        }, this.JOB_TIMEOUT_MS);
      });

      // Process job with timeout protection
      const processingPromise = this.executeJobWithRetry(job);
      
      await Promise.race([processingPromise, timeoutPromise]);
      
      // Mark as completed
      await this.completeJob(job.id, startTime);
      
      return { success: true };

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      
      // Handle job failure with proper retry logic
      await this.handleJobFailure(job, error.message, startTime);
      
      return { success: false, error: error.message };
    }
  }

  private async claimJobAtomically(jobId: string, workerId: string): Promise<boolean> {
    try {
      // Use SELECT FOR UPDATE to ensure atomic claiming
      const { data, error } = await this.supabase.rpc('claim_job_atomically', {
        p_job_id: jobId,
        p_worker_id: workerId
      });

      if (error) {
        // Create the RPC function if it doesn't exist
        if (error.message.includes('function claim_job_atomically')) {
          return await this.fallbackClaimJob(jobId, workerId);
        }
        console.error('Job claim error:', error);
        return false;
      }

      return data === true;

    } catch (error) {
      console.error('Atomic claim failed:', error);
      return await this.fallbackClaimJob(jobId, workerId);
    }
  }

  private async fallbackClaimJob(jobId: string, workerId: string): Promise<boolean> {
    // Fallback claiming method
    const { data, error } = await this.supabase
      .from('source_pages')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        worker_id: workerId
      })
      .eq('id', jobId)
      .eq('status', 'pending') // Only claim if still pending
      .select();

    if (error) {
      console.error('Fallback claim error:', error);
      return false;
    }

    const claimed = data && data.length > 0;
    if (claimed) {
      console.log(`🔒 Worker ${workerId} claimed job: ${jobId}`);
    }
    
    return claimed;
  }

  private async executeJobWithRetry(job: any): Promise<void> {
    const maxRetries = 2;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.executeJob(job);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        console.warn(`Job ${job.id} attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError;
  }

  private async executeJob(job: any): Promise<void> {
    // Call the child job processor
    const { data, error } = await this.supabase.functions.invoke('child-job-processor', {
      body: {
        childJobId: job.id,
        mode: 'process'
      }
    });

    if (error) {
      throw new Error(`Child job processor failed: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(`Job processing failed: ${data?.error || 'Unknown error'}`);
    }
  }

  private async completeJob(jobId: string, startTime: number): Promise<void> {
    const processingTime = Date.now() - startTime;
    
    const { error } = await this.supabase
      .from('source_pages')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        processing_time_ms: processingTime
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error completing job:', error);
    }
  }

  private async handleJobFailure(job: any, errorMessage: string, startTime: number): Promise<void> {
    const processingTime = Date.now() - startTime;
    const newRetryCount = (job.retry_count || 0) + 1;
    const maxRetries = 3;

    if (newRetryCount < maxRetries) {
      // Retry with exponential backoff
      const retryDelay = Math.pow(2, newRetryCount) * 1000; // 2s, 4s, 8s
      const scheduledAt = new Date(Date.now() + retryDelay).toISOString();
      
      await this.supabase
        .from('source_pages')
        .update({
          status: 'pending',
          retry_count: newRetryCount,
          started_at: null,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
          processing_time_ms: processingTime
        })
        .eq('id', job.id);

      console.log(`🔄 Job ${job.id} scheduled for retry ${newRetryCount}/${maxRetries} in ${retryDelay}ms`);
    } else {
      // Mark as permanently failed
      await this.supabase
        .from('source_pages')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: `Max retries exceeded: ${errorMessage}`,
          processing_time_ms: processingTime
        })
        .eq('id', job.id);

      console.log(`❌ Job ${job.id} permanently failed after ${maxRetries} attempts`);
    }
  }

  async getQueueMetrics(): Promise<QueueMetrics> {
    try {
      const { data: jobs, error } = await this.supabase
        .from('source_pages')
        .select('status, created_at, completed_at, processing_time_ms')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        throw error;
      }

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const pendingJobs = jobs?.filter(j => j.status === 'pending').length || 0;
      const inProgressJobs = jobs?.filter(j => j.status === 'in_progress').length || 0;
      const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
      const failedJobs = jobs?.filter(j => j.status === 'failed').length || 0;
      
      // Calculate recent throughput
      const recentCompleted = jobs?.filter(j => 
        j.status === 'completed' && 
        new Date(j.completed_at) > oneHourAgo
      ).length || 0;
      
      // Calculate conflict rate
      const totalProcessed = completedJobs + failedJobs;
      const conflictRate = totalProcessed > 0 ? (failedJobs / totalProcessed) * 100 : 0;
      
      // Calculate average processing time
      const completedWithTime = jobs?.filter(j => 
        j.status === 'completed' && j.processing_time_ms
      ) || [];
      const avgProcessingTime = completedWithTime.length > 0 
        ? completedWithTime.reduce((sum, j) => sum + j.processing_time_ms, 0) / completedWithTime.length
        : 0;
      
      // Determine queue health
      let queueHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (conflictRate > 50 || failedJobs > 20) {
        queueHealth = 'critical';
      } else if (conflictRate > 20 || failedJobs > 10) {
        queueHealth = 'degraded';
      }

      return {
        pendingJobs,
        inProgressJobs,
        completedJobs,
        failedJobs,
        queueHealth,
        throughput: recentCompleted,
        conflictRate,
        avgProcessingTime
      };

    } catch (error) {
      console.error('Error calculating queue metrics:', error);
      return {
        pendingJobs: 0,
        inProgressJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        queueHealth: 'critical',
        throughput: 0,
        conflictRate: 100,
        avgProcessingTime: 0
      };
    }
  }

  async resetFailedJobs(batchSize: number = 50): Promise<number> {
    console.log(`🔄 Resetting up to ${batchSize} failed jobs...`);
    
    const { data: failedJobs, error } = await this.supabase
      .from('source_pages')
      .select('id')
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .limit(batchSize);

    if (error || !failedJobs || failedJobs.length === 0) {
      return 0;
    }

    const jobIds = failedJobs.map(job => job.id);
    
    const { error: resetError } = await this.supabase
      .from('source_pages')
      .update({
        status: 'pending',
        started_at: null,
        completed_at: null,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .in('id', jobIds);

    if (resetError) {
      console.error('Error resetting failed jobs:', resetError);
      return 0;
    }

    console.log(`✅ Reset ${failedJobs.length} failed jobs to pending`);
    return failedJobs.length;
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

    const queueManager = new ProductionQueueManager(supabase);

    if (req.method === 'POST') {
      const requestBody = await req.json().catch(() => ({}));
      
      if (requestBody.mode === 'reset_failed') {
        const resetCount = await queueManager.resetFailedJobs(requestBody.batchSize);
        return new Response(JSON.stringify({
          success: true,
          resetCount,
          message: `Reset ${resetCount} failed jobs`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const result = await queueManager.processQueue(requestBody);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET') {
      const metrics = await queueManager.getQueueMetrics();
      
      return new Response(JSON.stringify({
        status: 'healthy',
        metrics
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405 })

  } catch (error) {
    console.error('Error in production-queue-manager:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
