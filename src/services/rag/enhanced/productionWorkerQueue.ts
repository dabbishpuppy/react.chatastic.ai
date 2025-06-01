
import { supabase } from "@/integrations/supabase/client";
import { RateLimitingService } from "./rateLimiting";

export interface WorkerJob {
  id: string;
  parentSourceId: string;
  customerId: string;
  url: string;
  priority: 'normal' | 'high' | 'slow';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  processingTimeMs?: number;
}

export interface QueueMetrics {
  totalPending: number;
  totalInProgress: number;
  totalCompleted: number;
  totalFailed: number;
  averageProcessingTime: number;
  queueDepth: number;
  workerUtilization: number;
}

export class ProductionWorkerQueue {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff
  private static workers: Map<string, { lastHeartbeat: number; status: 'idle' | 'busy' }> = new Map();
  private static isQueueProcessorRunning = false;

  // Start the production queue system
  static async startQueueProcessor(): Promise<void> {
    if (this.isQueueProcessorRunning) {
      console.log('Queue processor already running');
      return;
    }

    this.isQueueProcessorRunning = true;
    console.log('🚀 Starting production worker queue processor');

    // Set up real-time subscription for new jobs
    const channel = supabase
      .channel('worker-queue')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'source_pages' }, 
        async (payload) => {
          console.log('📨 New job detected:', payload.new);
          await this.processJobQueue();
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'source_pages' },
        async (payload) => {
          if (payload.new.status === 'pending' && payload.old.status !== 'pending') {
            console.log('🔄 Job retried:', payload.new);
            await this.processJobQueue();
          }
        }
      )
      .subscribe();

    // Start periodic queue processing
    this.startPeriodicQueueCheck();

    // Clean up workers periodically
    this.startWorkerHeartbeatCheck();
  }

  // Process the job queue
  private static async processJobQueue(): Promise<void> {
    try {
      // Get available workers
      const availableWorkerCount = this.getAvailableWorkerCount();
      
      if (availableWorkerCount === 0) {
        console.log('No available workers, skipping queue processing');
        return;
      }

      // Get pending jobs with priority ordering
      const { data: pendingJobs, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false }) // high > normal > slow
        .order('created_at', { ascending: true })
        .limit(availableWorkerCount * 2); // Get more than workers for efficiency

      if (error || !pendingJobs || pendingJobs.length === 0) {
        return;
      }

      console.log(`📋 Processing ${pendingJobs.length} pending jobs with ${availableWorkerCount} available workers`);

      // Process jobs in batches
      const jobsToProcess = pendingJobs.slice(0, availableWorkerCount);
      
      for (const job of jobsToProcess) {
        await this.assignJobToWorker(job);
      }

    } catch (error) {
      console.error('Error processing job queue:', error);
    }
  }

  // Assign a job to an available worker
  private static async assignJobToWorker(job: any): Promise<void> {
    try {
      // Check rate limits for the customer
      const rateLimitCheck = await RateLimitingService.canStartCrawl(job.customer_id, 1);
      
      if (!rateLimitCheck.allowed) {
        console.log(`⏸️ Rate limit exceeded for customer ${job.customer_id}: ${rateLimitCheck.reason}`);
        
        // Mark job as failed due to rate limiting
        await supabase
          .from('source_pages')
          .update({
            status: 'failed',
            error_message: `Rate limit exceeded: ${rateLimitCheck.reason}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        return;
      }

      // Update job to in_progress
      const { error: updateError } = await supabase
        .from('source_pages')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
        .eq('status', 'pending'); // Ensure job is still pending

      if (updateError) {
        console.error('Failed to update job status:', updateError);
        return;
      }

      // Register worker as busy
      const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.registerWorker(workerId, 'busy');

      // Process the job asynchronously
      this.processJobAsync(job, workerId);

    } catch (error) {
      console.error('Error assigning job to worker:', error);
    }
  }

  // Process a job asynchronously
  private static async processJobAsync(job: any, workerId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Worker ${workerId} processing job ${job.id}: ${job.url}`);

      // Call the child job processor
      const { data, error } = await supabase.functions.invoke('child-job-processor', {
        body: { childJobId: job.id }
      });

      const processingTime = Date.now() - startTime;

      if (error) {
        throw new Error(error.message || 'Unknown processing error');
      }

      console.log(`✅ Worker ${workerId} completed job ${job.id} in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ Worker ${workerId} failed job ${job.id}:`, errorMessage);

      // Check if we should retry
      const shouldRetry = job.retry_count < this.MAX_RETRIES;
      
      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const retryDelay = this.RETRY_DELAYS[job.retry_count] || 15000;
        
        setTimeout(async () => {
          await supabase
            .from('source_pages')
            .update({
              status: 'pending',
              retry_count: job.retry_count + 1,
              error_message: null,
              started_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
            
          console.log(`🔄 Retrying job ${job.id} (attempt ${job.retry_count + 2})`);
        }, retryDelay);
      } else {
        // Mark as permanently failed
        await supabase
          .from('source_pages')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
            processing_time_ms: processingTime
          })
          .eq('id', job.id);
      }

    } finally {
      // Mark worker as idle
      this.registerWorker(workerId, 'idle');
    }
  }

  // Worker management
  private static registerWorker(workerId: string, status: 'idle' | 'busy'): void {
    this.workers.set(workerId, {
      lastHeartbeat: Date.now(),
      status
    });
  }

  private static getAvailableWorkerCount(): number {
    const now = Date.now();
    const activeWorkers = Array.from(this.workers.entries()).filter(
      ([_, worker]) => now - worker.lastHeartbeat < 30000 // 30 second timeout
    );
    
    const idleWorkers = activeWorkers.filter(([_, worker]) => worker.status === 'idle');
    
    // Simulate dynamic worker scaling (in production, this would be real workers)
    const maxWorkers = Math.min(10, Math.max(2, Math.ceil(activeWorkers.length * 1.5)));
    return Math.max(0, maxWorkers - (activeWorkers.length - idleWorkers.length));
  }

  // Periodic maintenance
  private static startPeriodicQueueCheck(): void {
    setInterval(async () => {
      await this.processJobQueue();
    }, 5000); // Check every 5 seconds
  }

  private static startWorkerHeartbeatCheck(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [workerId, worker] of this.workers.entries()) {
        if (now - worker.lastHeartbeat > 60000) { // 1 minute timeout
          this.workers.delete(workerId);
          console.log(`🧹 Cleaned up stale worker: ${workerId}`);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // Get queue metrics
  static async getQueueMetrics(): Promise<QueueMetrics> {
    const { data: jobs } = await supabase
      .from('source_pages')
      .select('status, processing_time_ms, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (!jobs) {
      return {
        totalPending: 0,
        totalInProgress: 0,
        totalCompleted: 0,
        totalFailed: 0,
        averageProcessingTime: 0,
        queueDepth: 0,
        workerUtilization: 0
      };
    }

    const metrics = {
      totalPending: jobs.filter(j => j.status === 'pending').length,
      totalInProgress: jobs.filter(j => j.status === 'in_progress').length,
      totalCompleted: jobs.filter(j => j.status === 'completed').length,
      totalFailed: jobs.filter(j => j.status === 'failed').length,
      averageProcessingTime: 0,
      queueDepth: 0,
      workerUtilization: 0
    };

    const completedJobs = jobs.filter(j => j.status === 'completed' && j.processing_time_ms);
    if (completedJobs.length > 0) {
      metrics.averageProcessingTime = completedJobs.reduce((sum, j) => sum + (j.processing_time_ms || 0), 0) / completedJobs.length;
    }

    metrics.queueDepth = metrics.totalPending + metrics.totalInProgress;
    
    const activeWorkers = Array.from(this.workers.values()).filter(
      w => Date.now() - w.lastHeartbeat < 30000
    );
    const busyWorkers = activeWorkers.filter(w => w.status === 'busy');
    metrics.workerUtilization = activeWorkers.length > 0 ? busyWorkers.length / activeWorkers.length : 0;

    return metrics;
  }

  // Health check
  static async getHealthStatus(): Promise<{
    healthy: boolean;
    queueDepth: number;
    activeWorkers: number;
    avgProcessingTime: number;
    errorRate: number;
  }> {
    const metrics = await this.getQueueMetrics();
    const activeWorkers = Array.from(this.workers.values()).filter(
      w => Date.now() - w.lastHeartbeat < 30000
    ).length;

    const totalJobs = metrics.totalCompleted + metrics.totalFailed;
    const errorRate = totalJobs > 0 ? metrics.totalFailed / totalJobs : 0;

    const healthy = metrics.queueDepth < 1000 && // Queue not too deep
                   activeWorkers > 0 && // Workers are running
                   errorRate < 0.1 && // Error rate under 10%
                   metrics.averageProcessingTime < 30000; // Avg processing under 30s

    return {
      healthy,
      queueDepth: metrics.queueDepth,
      activeWorkers,
      avgProcessingTime: metrics.averageProcessingTime,
      errorRate
    };
  }

  // Manually trigger queue processing (for testing)
  static async triggerQueueProcessing(): Promise<void> {
    await this.processJobQueue();
  }

  // Stop the queue processor
  static stopQueueProcessor(): void {
    this.isQueueProcessorRunning = false;
    this.workers.clear();
    console.log('🛑 Production worker queue processor stopped');
  }
}
