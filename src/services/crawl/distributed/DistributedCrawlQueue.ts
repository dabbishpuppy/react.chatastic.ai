
import { supabase } from '@/integrations/supabase/client';

export interface CrawlJob {
  id: string;
  parentSourceId: string;
  agentId: string;
  batchUrls: string[];
  priority: 'low' | 'normal' | 'high';
  retryCount: number;
  domain: string;
  userId?: string;
  metadata: {
    crawlConfig: any;
    totalPages: number;
    processedPages: number;
    estimatedCompletion?: string;
  };
}

export interface QueueMetrics {
  pendingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgProcessingTime: number;
}

export class DistributedCrawlQueue {
  private static readonly QUEUE_NAME = 'crawl_jobs';
  private static readonly MAX_CONCURRENT_JOBS = 50;
  private static readonly MAX_RETRIES = 3;

  /**
   * Enqueue a batch of URLs for crawling
   */
  static async enqueueCrawlBatch(job: Omit<CrawlJob, 'id' | 'retryCount'>): Promise<string> {
    console.log(`📋 Enqueuing crawl batch for domain: ${job.domain}`);

    const jobData = {
      ...job,
      retryCount: 0,
      scheduledAt: new Date().toISOString(),
      priority: this.calculatePriority(job.batchUrls.length, job.priority)
    };

    const { data, error } = await supabase
      .from('background_jobs')
      .insert({
        job_type: 'crawl_batch',
        source_id: job.parentSourceId,
        payload: jobData,
        priority: this.getPriorityScore(jobData.priority),
        scheduled_at: jobData.scheduledAt,
        max_attempts: this.MAX_RETRIES + 1
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to enqueue crawl batch:', error);
      throw error;
    }

    console.log(`✅ Crawl batch enqueued with job ID: ${data.id}`);
    return data.id;
  }

  /**
   * Get next available job with domain-based coordination
   */
  static async getNextJob(): Promise<CrawlJob | null> {
    // Use existing background_jobs table instead of custom function
    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('job_type', 'crawl_batch')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('❌ Failed to get next job:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const job = data[0];
    return {
      id: job.id,
      parentSourceId: job.source_id,
      agentId: job.payload.agentId,
      batchUrls: job.payload.batchUrls,
      priority: job.payload.priority,
      retryCount: job.attempts,
      domain: job.payload.domain,
      userId: job.payload.userId,
      metadata: job.payload.metadata
    };
  }

  /**
   * Mark job as completed
   */
  static async completeJob(jobId: string, result: any): Promise<void> {
    const { error } = await supabase
      .from('background_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('❌ Failed to complete job:', error);
      throw error;
    }

    console.log(`✅ Job ${jobId} marked as completed`);
  }

  /**
   * Mark job as failed and handle retry logic
   */
  static async failJob(jobId: string, error: string, shouldRetry: boolean = true): Promise<void> {
    if (shouldRetry) {
      const { error: updateError } = await supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          attempts: supabase.sql`attempts + 1`,
          error_message: error,
          scheduled_at: new Date(Date.now() + this.calculateRetryDelay()).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .lt('attempts', this.MAX_RETRIES);

      if (updateError) {
        console.error('❌ Failed to retry job:', updateError);
      } else {
        console.log(`🔄 Job ${jobId} scheduled for retry`);
      }
    } else {
      const { error: updateError } = await supabase
        .from('background_jobs')
        .update({
          status: 'failed',
          error_message: error,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('❌ Failed to mark job as failed:', updateError);
      } else {
        console.log(`❌ Job ${jobId} marked as failed`);
      }
    }
  }

  /**
   * Get queue metrics for monitoring
   */
  static async getQueueMetrics(): Promise<QueueMetrics> {
    try {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('status, created_at, completed_at')
        .eq('job_type', 'crawl_batch');

      if (error) {
        console.error('❌ Failed to get queue metrics:', error);
        return {
          pendingJobs: 0,
          activeJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          avgProcessingTime: 0
        };
      }

      const jobs = data || [];
      const pending = jobs.filter(j => j.status === 'pending').length;
      const active = jobs.filter(j => j.status === 'processing').length;
      const completed = jobs.filter(j => j.status === 'completed').length;
      const failed = jobs.filter(j => j.status === 'failed').length;

      // Calculate average processing time
      const completedJobs = jobs.filter(j => j.status === 'completed' && j.completed_at);
      let avgProcessingTime = 0;
      if (completedJobs.length > 0) {
        const totalTime = completedJobs.reduce((sum, job) => {
          const start = new Date(job.created_at).getTime();
          const end = new Date(job.completed_at!).getTime();
          return sum + (end - start);
        }, 0);
        avgProcessingTime = totalTime / completedJobs.length;
      }

      return {
        pendingJobs: pending,
        activeJobs: active,
        completedJobs: completed,
        failedJobs: failed,
        avgProcessingTime
      };
    } catch (error) {
      console.error('❌ Error getting queue metrics:', error);
      return {
        pendingJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        avgProcessingTime: 0
      };
    }
  }

  private static calculatePriority(batchSize: number, requestedPriority: string): 'low' | 'normal' | 'high' {
    // Small batches get higher priority
    if (batchSize <= 5) return 'high';
    if (batchSize <= 20) return 'normal';
    return requestedPriority as 'low' | 'normal' | 'high' || 'low';
  }

  private static getPriorityScore(priority: string): number {
    switch (priority) {
      case 'high': return 10;
      case 'normal': return 50;
      case 'low': return 100;
      default: return 50;
    }
  }

  private static calculateRetryDelay(): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.pow(2, 1) * 1000;
  }
}
