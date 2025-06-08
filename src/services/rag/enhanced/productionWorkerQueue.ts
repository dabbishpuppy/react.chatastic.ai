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

export interface QueueMetrics {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgProcessingTime: number;
  throughputPerMinute: number;
}

export interface HealthStatus {
  healthy: boolean;
  issues: string[];
  metrics: {
    queueLength: number;
    processingRate: number;
    errorRate: number;
  };
}

export class ProductionWorkerQueue {
  private static readonly QUEUE_CONFIG = {
    maxConcurrentJobs: 50,
    defaultPriority: 100,
    maxRetries: 3,
    batchSize: 10,
    processingTimeout: 300000 // 5 minutes
  };

  private static isProcessorRunning = false;
  private static processorInterval: NodeJS.Timeout | null = null;

  /**
   * Start the queue processor
   */
  static async startQueueProcessor(): Promise<void> {
    if (this.isProcessorRunning) {
      console.log('Queue processor already running');
      return;
    }

    console.log('🚀 Starting production worker queue processor...');
    this.isProcessorRunning = true;

    // Start processing interval
    this.processorInterval = setInterval(async () => {
      if (this.isProcessorRunning) {
        await this.processQueueBatch();
      }
    }, 5000); // Process every 5 seconds

    console.log('✅ Queue processor started');
  }

  /**
   * Stop the queue processor
   */
  static async stopQueueProcessor(): Promise<void> {
    console.log('🛑 Stopping production worker queue processor...');
    this.isProcessorRunning = false;

    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.processorInterval = null;
    }

    console.log('✅ Queue processor stopped');
  }

  /**
   * Process a batch of jobs
   */
  private static async processQueueBatch(): Promise<void> {
    try {
      const jobs = await this.getNextJobs('all', this.QUEUE_CONFIG.batchSize);
      
      for (const job of jobs) {
        if (this.isProcessorRunning) {
          await this.processJob(job);
        }
      }
    } catch (error) {
      console.error('Error processing queue batch:', error);
    }
  }

  /**
   * Process a single job
   */
  private static async processJob(job: WorkerJob): Promise<void> {
    try {
      await this.startJob(job.id);
      
      // Simulate job processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.completeJob(job.id);
    } catch (error) {
      await this.failJob(job.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get queue metrics
   */
  static async getQueueMetrics(): Promise<QueueMetrics> {
    try {
      const stats = await this.getQueueStats();
      
      return {
        totalJobs: stats.totalProcessed + stats.pending + stats.running,
        pendingJobs: stats.pending,
        runningJobs: stats.running,
        completedJobs: stats.completed,
        failedJobs: stats.failed,
        avgProcessingTime: stats.avgProcessingTime,
        throughputPerMinute: Math.round(stats.completed / 60) // Rough estimate
      };
    } catch (error) {
      console.error('Failed to get queue metrics:', error);
      return {
        totalJobs: 0,
        pendingJobs: 0,
        runningJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        avgProcessingTime: 0,
        throughputPerMinute: 0
      };
    }
  }

  /**
   * Get health status
   */
  static async getHealthStatus(): Promise<HealthStatus> {
    try {
      const metrics = await this.getQueueMetrics();
      const issues: string[] = [];
      
      // Check for issues
      if (metrics.pendingJobs > 1000) {
        issues.push('High queue backlog detected');
      }
      
      if (metrics.avgProcessingTime > 60000) {
        issues.push('Slow processing times detected');
      }
      
      const errorRate = metrics.failedJobs / (metrics.totalJobs || 1) * 100;
      if (errorRate > 10) {
        issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
      }

      return {
        healthy: issues.length === 0,
        issues,
        metrics: {
          queueLength: metrics.pendingJobs,
          processingRate: metrics.throughputPerMinute,
          errorRate: errorRate
        }
      };
    } catch (error) {
      console.error('Failed to get health status:', error);
      return {
        healthy: false,
        issues: ['Failed to check health status'],
        metrics: {
          queueLength: 0,
          processingRate: 0,
          errorRate: 0
        }
      };
    }
  }

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
        p_job_key: null,
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
      let query = supabase
        .from('background_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (workerType !== 'all') {
        query = query.eq('job_type', workerType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(job => ({
        id: job.id,
        type: job.job_type,
        priority: job.priority || this.QUEUE_CONFIG.defaultPriority,
        payload: (job.payload as Record<string, any>) || {},
        status: job.status as WorkerJob['status'],
        attempts: job.attempts || 0,
        maxAttempts: job.max_attempts || this.QUEUE_CONFIG.maxRetries,
        scheduledAt: new Date(job.scheduled_at),
        startedAt: job.started_at ? new Date(job.started_at) : undefined,
        completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
        errorMessage: job.error_message || undefined,
        customerId: ((job.payload as Record<string, any>)?.customerId as string) || 'unknown',
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
        .eq('status', 'pending');

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
        updateData.status = 'failed';
        updateData.completed_at = new Date().toISOString();
      } else {
        const delayMs = Math.pow(2, newAttempts) * 1000;
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
