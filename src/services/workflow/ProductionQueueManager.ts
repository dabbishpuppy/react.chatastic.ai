
import { supabase } from '@/integrations/supabase/client';
import { AutomaticQueueRecovery } from './AutomaticQueueRecovery';
import { QueueStarvationProtection } from './QueueStarvationProtection';
import { DeadLetterQueue } from './DeadLetterQueue';
import { JobHeartbeat } from './JobHeartbeat';

export class ProductionQueueManager {
  private static instance: ProductionQueueManager | null = null;
  private static isRunning = false;
  private static processingInterval: number | null = null;
  private static readonly PROCESSING_INTERVAL = 5000; // 5 seconds
  private static readonly MAX_CONCURRENT_JOBS = 10;
  private static readonly JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get singleton instance
   */
  static getInstance(): ProductionQueueManager {
    if (!this.instance) {
      this.instance = new ProductionQueueManager();
    }
    return this.instance;
  }

  /**
   * Start the production queue manager with all reliability features
   */
  async startProductionQueue(): Promise<void> {
    if (ProductionQueueManager.isRunning) {
      console.log('📋 Production queue already running');
      return;
    }

    console.log('🚀 Starting production queue manager with reliability features...');
    
    // Start all reliability systems
    AutomaticQueueRecovery.startRecoverySystem();
    
    ProductionQueueManager.isRunning = true;

    // Start main processing loop
    ProductionQueueManager.processingInterval = window.setInterval(() => {
      this.processJobsWithReliability();
    }, ProductionQueueManager.PROCESSING_INTERVAL);

    console.log('✅ Production queue manager started');
  }

  /**
   * Stop the production queue manager
   */
  async stopProductionQueue(): Promise<void> {
    if (ProductionQueueManager.processingInterval) {
      clearInterval(ProductionQueueManager.processingInterval);
      ProductionQueueManager.processingInterval = null;
    }

    AutomaticQueueRecovery.stopRecoverySystem();
    ProductionQueueManager.isRunning = false;
    
    console.log('🛑 Production queue manager stopped');
  }

  /**
   * Process jobs with full reliability features
   */
  private async processJobsWithReliability(): Promise<void> {
    try {
      // Get jobs using starvation protection
      const jobs = await QueueStarvationProtection.getNextJobBatch(ProductionQueueManager.MAX_CONCURRENT_JOBS);
      
      if (jobs.length === 0) {
        return;
      }

      console.log(`📋 Processing ${jobs.length} jobs with reliability features`);

      // Process jobs with atomic claiming and heartbeat monitoring
      const processingPromises = jobs.map(job => this.processJobSafely(job));
      
      // Wait for all jobs to complete (or timeout)
      await Promise.allSettled(processingPromises);

    } catch (error) {
      console.error('❌ Error in reliable job processing:', error);
    }
  }

  /**
   * Process a single job with full safety measures
   */
  private async processJobSafely(job: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 1. Atomic job claiming with database lock
      const claimed = await this.claimJobAtomically(job.id);
      if (!claimed) {
        return; // Job already claimed by another processor
      }

      // 2. Register for heartbeat monitoring
      JobHeartbeat.registerJob(job.id);

      // 3. Set up job timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job ${job.id} timed out after ${ProductionQueueManager.JOB_TIMEOUT_MS}ms`));
        }, ProductionQueueManager.JOB_TIMEOUT_MS);
      });

      // 4. Process job with heartbeat updates
      const processingPromise = this.executeJobWithHeartbeat(job);

      // 5. Race between processing and timeout
      await Promise.race([processingPromise, timeoutPromise]);

      // 6. Mark job as completed
      await this.completeJob(job.id, startTime);

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      await this.handleJobFailure(job, error as Error, startTime);
    } finally {
      // 7. Always unregister from heartbeat monitoring
      JobHeartbeat.unregisterJob(job.id);
    }
  }

  /**
   * Atomically claim a job using database locks
   */
  private async claimJobAtomically(jobId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
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

      const claimed = data && data.length > 0;
      if (claimed) {
        console.log(`🔒 Successfully claimed job: ${jobId}`);
      } else {
        console.log(`⚠️ Job ${jobId} could not be claimed (already processed or in progress)`);
      }

      return claimed;
    } catch (error) {
      console.error('Failed to claim job atomically:', error);
      return false;
    }
  }

  /**
   * Execute job with regular heartbeat updates
   */
  private async executeJobWithHeartbeat(job: any): Promise<void> {
    // Start heartbeat timer
    const heartbeatTimer = setInterval(() => {
      JobHeartbeat.sendHeartbeat(job.id);
    }, 15000); // Send heartbeat every 15 seconds

    try {
      // Call the appropriate job processor based on job type
      await this.dispatchJob(job);
    } finally {
      clearInterval(heartbeatTimer);
    }
  }

  /**
   * Dispatch job to appropriate processor
   */
  private async dispatchJob(job: any): Promise<void> {
    // Send heartbeat before starting
    JobHeartbeat.sendHeartbeat(job.id);

    // This is where you'd call your actual job processors
    // For now, we'll simulate the processing
    switch (job.job_type) {
      case 'crawl_pages':
        await this.simulateJobProcessing(job, 'crawling');
        break;
      case 'train_pages':
        await this.simulateJobProcessing(job, 'training');
        break;
      case 'process_page':
        await this.simulateJobProcessing(job, 'processing');
        break;
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }
  }

  /**
   * Simulate job processing (replace with actual processors)
   */
  private async simulateJobProcessing(job: any, type: string): Promise<void> {
    console.log(`🔄 ${type} job ${job.id}...`);
    
    // Simulate work with heartbeats
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      JobHeartbeat.sendHeartbeat(job.id);
    }
    
    console.log(`✅ Completed ${type} job ${job.id}`);
  }

  /**
   * Complete a job successfully
   */
  private async completeJob(jobId: string, startTime: number): Promise<void> {
    const processingTime = Date.now() - startTime;
    
    const { error } = await supabase
      .from('background_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error completing job:', error);
    } else {
      console.log(`✅ Job ${jobId} completed in ${processingTime}ms`);
    }
  }

  /**
   * Handle job failure with retry logic and dead letter queue
   */
  private async handleJobFailure(job: any, error: Error, startTime: number): Promise<void> {
    const processingTime = Date.now() - startTime;
    const newAttempts = job.attempts + 1;

    if (DeadLetterQueue.shouldMoveToDeadLetter(newAttempts, job.max_attempts)) {
      // Move to dead letter queue
      await DeadLetterQueue.moveToDeadLetter(
        job.id,
        job.job_type,
        job.source_id,
        error.message,
        job.payload,
        job.page_id
      );
    } else {
      // Retry with exponential backoff
      const retryDelay = Math.pow(2, newAttempts) * 1000; // 2s, 4s, 8s...
      const scheduledAt = new Date(Date.now() + retryDelay).toISOString();
      
      await supabase
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

  /**
   * Get comprehensive queue statistics
   */
  async getProductionQueueStats(): Promise<{
    isRunning: boolean;
    queueHealth: any;
    heartbeatStats: any;
    recoveryStatus: any;
    deadLetterStats: any;
  }> {
    const queueHealth = await QueueStarvationProtection.monitorQueueHealth();
    const heartbeatStats = JobHeartbeat.getStatistics();
    const recoveryStatus = AutomaticQueueRecovery.getRecoveryStatus();
    const deadLetterStats = await DeadLetterQueue.getStatistics();

    return {
      isRunning: ProductionQueueManager.isRunning,
      queueHealth,
      heartbeatStats,
      recoveryStatus,
      deadLetterStats
    };
  }

  /**
   * Manually trigger queue recovery
   */
  async triggerManualRecovery(): Promise<void> {
    await AutomaticQueueRecovery.forceRecoveryCheck();
  }
}
