
import { supabase } from "@/integrations/supabase/client";

export interface WorkerJob {
  id: string;
  type: string;
  priority: number;
  payload: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  customerId: string;
  sourceId?: string;
  pageId?: string;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  avgProcessingTime: number;
}

export class ProductionWorkerQueue {
  private static readonly QUEUE_CONFIG = {
    maxConcurrentJobs: 50,
    defaultPriority: 100,
    maxRetries: 3,
    batchSize: 10,
    processingTimeout: 300000 // 5 minutes
  };

  /**
   * Add a job to the worker queue
   */
  static async enqueueJob(
    type: string,
    payload: Record<string, any>,
    options: {
      priority?: number;
      maxAttempts?: number;
      scheduledAt?: Date;
      customerId: string;
      sourceId?: string;
      pageId?: string;
    }
  ): Promise<string> {
    try {
      console.log(`📝 Enqueuing job of type: ${type}`, {
        customerId: options.customerId,
        priority: options.priority || this.QUEUE_CONFIG.defaultPriority
      });

      const { data, error } = await supabase.rpc('enqueue_job', {
        p_job_type: type,
        p_source_id: options.sourceId || null,
        p_page_id: options.pageId || null,
        p_job_key: null, // Let the function generate it
        p_payload: {
          ...payload,
          customerId: options.customerId
        },
        p_priority: options.priority || this.QUEUE_CONFIG.defaultPriority
      });

      if (error) throw error;

      console.log(`✅ Job enqueued successfully: ${data}`);
      return data;
    } catch (error) {
      console.error('Failed to enqueue job:', error);
      throw error;
    }
  }

  /**
   * Get next batch of jobs to process
   */
  static async getNextJobs(
    workerType: string,
    limit: number = this.QUEUE_CONFIG.batchSize
  ): Promise<WorkerJob[]> {
    try {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('status', 'pending')
        .eq('job_type', workerType)
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(job => ({
        id: job.id,
        type: job.job_type,
        priority: job.priority || this.QUEUE_CONFIG.defaultPriority,
        payload: job.payload || {},
        status: job.status as WorkerJob['status'],
        attempts: job.attempts || 0,
        maxAttempts: job.max_attempts || this.QUEUE_CONFIG.maxRetries,
        scheduledAt: new Date(job.scheduled_at),
        startedAt: job.started_at ? new Date(job.started_at) : undefined,
        completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
        errorMessage: job.error_message || undefined,
        customerId: job.payload?.customerId || 'unknown',
        sourceId: job.source_id || undefined,
        pageId: job.page_id || undefined
      }));
    } catch (error) {
      console.error('Failed to get next jobs:', error);
      return [];
    }
  }

  /**
   * Mark job as started
   */
  static async startJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('background_jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'pending'); // Only start if still pending

      return !error;
    } catch (error) {
      console.error('Failed to start job:', error);
      return false;
    }
  }

  /**
   * Mark job as completed
   */
  static async completeJob(
    jobId: string,
    result?: Record<string, any>
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (result) {
        updateData.payload = {
          ...updateData.payload,
          result
        };
      }

      const { error } = await supabase
        .from('background_jobs')
        .update(updateData)
        .eq('id', jobId);

      return !error;
    } catch (error) {
      console.error('Failed to complete job:', error);
      return false;
    }
  }

  /**
   * Mark job as failed and handle retries
   */
  static async failJob(
    jobId: string,
    errorMessage: string,
    shouldRetry: boolean = true
  ): Promise<boolean> {
    try {
      // Get current job details
      const { data: job, error: fetchError } = await supabase
        .from('background_jobs')
        .select('attempts, max_attempts')
        .eq('id', jobId)
        .single();

      if (fetchError) throw fetchError;

      const newAttempts = (job.attempts || 0) + 1;
      const maxAttempts = job.max_attempts || this.QUEUE_CONFIG.maxRetries;

      let updateData: any = {
        attempts: newAttempts,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      };

      if (!shouldRetry || newAttempts >= maxAttempts) {
        // Final failure
        updateData.status = 'failed';
        updateData.completed_at = new Date().toISOString();
      } else {
        // Retry - exponential backoff
        const delayMs = Math.pow(2, newAttempts) * 1000; // 2^n seconds
        const retryAt = new Date(Date.now() + delayMs);
        
        updateData.status = 'pending';
        updateData.scheduled_at = retryAt.toISOString();
      }

      const { error } = await supabase
        .from('background_jobs')
        .update(updateData)
        .eq('id', jobId);

      return !error;
    } catch (error) {
      console.error('Failed to fail job:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(jobType?: string): Promise<QueueStats> {
    try {
      let query = supabase.from('background_jobs').select('status, created_at, started_at, completed_at');
      
      if (jobType) {
        query = query.eq('job_type', jobType);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        totalProcessed: 0,
        avgProcessingTime: 0
      };

      let totalProcessingTime = 0;
      let processedJobs = 0;

      (data || []).forEach(job => {
        stats[job.status as keyof Omit<QueueStats, 'totalProcessed' | 'avgProcessingTime'>]++;
        
        if (job.status === 'completed' && job.started_at && job.completed_at) {
          const processingTime = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
          totalProcessingTime += processingTime;
          processedJobs++;
        }
      });

      stats.totalProcessed = stats.completed + stats.failed;
      stats.avgProcessingTime = processedJobs > 0 ? totalProcessingTime / processedJobs : 0;

      return stats;
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        totalProcessed: 0,
        avgProcessingTime: 0
      };
    }
  }

  /**
   * Clean up old completed/failed jobs
   */
  static async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data, error } = await supabase
        .from('background_jobs')
        .delete()
        .in('status', ['completed', 'failed'])
        .lt('completed_at', cutoffDate.toISOString())
        .select('id');

      if (error) throw error;

      const deletedCount = data?.length || 0;
      console.log(`🧹 Cleaned up ${deletedCount} old jobs`);
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old jobs:', error);
      return 0;
    }
  }

  /**
   * Cancel pending jobs
   */
  static async cancelJobs(criteria: {
    jobType?: string;
    customerId?: string;
    sourceId?: string;
  }): Promise<number> {
    try {
      let query = supabase
        .from('background_jobs')
        .delete()
        .eq('status', 'pending');

      if (criteria.jobType) {
        query = query.eq('job_type', criteria.jobType);
      }

      if (criteria.sourceId) {
        query = query.eq('source_id', criteria.sourceId);
      }

      // For customerId, we need to check the payload
      const { data, error } = await query.select('id');

      if (error) throw error;

      const cancelledCount = data?.length || 0;
      console.log(`❌ Cancelled ${cancelledCount} pending jobs`);
      
      return cancelledCount;
    } catch (error) {
      console.error('Failed to cancel jobs:', error);
      return 0;
    }
  }
}
