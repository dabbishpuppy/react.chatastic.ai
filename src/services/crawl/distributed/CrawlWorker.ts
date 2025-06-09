
import { DistributedCrawlQueue, CrawlJob } from './DistributedCrawlQueue';
import { DomainRateLimiter, DomainLock } from './DomainRateLimiter';
import { CrawlProgressPublisher } from './CrawlProgressPublisher';

export interface WorkerMetrics {
  workerId: string;
  jobsProcessed: number;
  jobsSucceeded: number;
  jobsFailed: number;
  avgProcessingTime: number;
  isActive: boolean;
  lastActivity: string;
}

export class CrawlWorker {
  private static readonly WORKER_ID = `worker-${Math.random().toString(36).substr(2, 9)}`;
  private static readonly POLL_INTERVAL = 1000; // 1 second
  private static readonly MAX_PROCESSING_TIME = 5 * 60 * 1000; // 5 minutes

  private static isRunning = false;
  private static pollInterval: number | null = null;
  private static metrics: WorkerMetrics = {
    workerId: this.WORKER_ID,
    jobsProcessed: 0,
    jobsSucceeded: 0,
    jobsFailed: 0,
    avgProcessingTime: 0,
    isActive: false,
    lastActivity: new Date().toISOString()
  };

  /**
   * Start the crawl worker
   */
  static async startWorker(): Promise<void> {
    if (this.isRunning) {
      console.log('🟡 Crawl worker already running');
      return;
    }

    console.log(`🚀 Starting crawl worker: ${this.WORKER_ID}`);
    this.isRunning = true;
    this.metrics.isActive = true;

    // Start the main processing loop
    this.pollInterval = window.setInterval(() => {
      this.processNextJob();
    }, this.POLL_INTERVAL);

    // Start cleanup tasks
    setInterval(() => {
      DomainRateLimiter.cleanupExpiredLocks();
    }, 60000); // Every minute

    console.log(`✅ Crawl worker started: ${this.WORKER_ID}`);
  }

  /**
   * Stop the crawl worker
   */
  static stopWorker(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.isRunning = false;
    this.metrics.isActive = false;
    console.log(`🛑 Crawl worker stopped: ${this.WORKER_ID}`);
  }

  /**
   * Process the next available job
   */
  private static async processNextJob(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Get next job from queue
      const job = await DistributedCrawlQueue.getNextJob();
      if (!job) {
        return; // No jobs available
      }

      console.log(`📋 Processing job: ${job.id} for domain: ${job.domain}`);
      
      // Try to acquire domain lock
      const lock = await DomainRateLimiter.acquireDomainLock(job.domain);
      if (!lock) {
        console.log(`⏳ Could not acquire lock for domain: ${job.domain}, skipping job`);
        return;
      }

      const startTime = Date.now();
      
      try {
        // Process the job with timeout
        const result = await Promise.race([
          this.executeJob(job, lock),
          this.createTimeoutPromise(job.id)
        ]);

        // Mark job as completed
        await DistributedCrawlQueue.completeJob(job.id, result);
        
        const processingTime = Date.now() - startTime;
        this.updateSuccessMetrics(processingTime);
        
        console.log(`✅ Job ${job.id} completed in ${processingTime}ms`);

      } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error);
        
        const shouldRetry = job.retryCount < 3 && !this.isFatalError(error);
        await DistributedCrawlQueue.failJob(
          job.id, 
          error instanceof Error ? error.message : 'Unknown error',
          shouldRetry
        );
        
        this.updateFailureMetrics();
        
      } finally {
        // Always release the domain lock
        await DomainRateLimiter.releaseDomainLock(lock);
      }

    } catch (error) {
      console.error('❌ Error in job processing loop:', error);
    }
  }

  /**
   * Execute a crawl job
   */
  private static async executeJob(job: CrawlJob, lock: DomainLock): Promise<any> {
    const progressPublisher = new CrawlProgressPublisher(job.parentSourceId);
    
    try {
      // Publish job started event
      await progressPublisher.publishProgress({
        status: 'processing',
        progress: 0,
        message: `Processing batch of ${job.batchUrls.length} pages`,
        metadata: {
          batchId: job.id,
          domain: job.domain,
          workerId: this.WORKER_ID
        }
      });

      const results = [];
      
      for (let i = 0; i < job.batchUrls.length; i++) {
        const url = job.batchUrls[i];
        
        // Wait for rate limit
        await DomainRateLimiter.waitForRateLimit(job.domain);
        
        try {
          // Process individual page
          const pageResult = await this.processPage(url, job);
          results.push({ url, success: true, result: pageResult });
          
          // Publish progress update
          const progress = ((i + 1) / job.batchUrls.length) * 100;
          await progressPublisher.publishProgress({
            status: 'processing',
            progress,
            message: `Processed ${i + 1}/${job.batchUrls.length} pages`,
            metadata: {
              batchId: job.id,
              currentUrl: url,
              completedPages: i + 1,
              totalPages: job.batchUrls.length
            }
          });
          
        } catch (pageError) {
          console.error(`❌ Failed to process page ${url}:`, pageError);
          results.push({ 
            url, 
            success: false, 
            error: pageError instanceof Error ? pageError.message : 'Unknown error' 
          });
        }
      }
      
      // Publish batch completed event
      await progressPublisher.publishProgress({
        status: 'completed',
        progress: 100,
        message: `Batch completed: ${results.filter(r => r.success).length}/${results.length} pages successful`,
        metadata: {
          batchId: job.id,
          results: results
        }
      });
      
      return {
        batchId: job.id,
        processedUrls: job.batchUrls.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        results: results
      };
      
    } catch (error) {
      await progressPublisher.publishProgress({
        status: 'failed',
        progress: 0,
        message: `Batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          batchId: job.id,
          error: error
        }
      });
      
      throw error;
    }
  }

  /**
   * Process a single page
   */
  private static async processPage(url: string, job: CrawlJob): Promise<any> {
    // This would call your existing page processing logic
    // For now, simulate processing
    console.log(`📄 Processing page: ${url}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    return {
      url,
      contentSize: Math.floor(Math.random() * 50000) + 1000,
      chunksCreated: Math.floor(Math.random() * 20) + 1,
      processingTime: Date.now()
    };
  }

  /**
   * Create a timeout promise for job processing
   */
  private static createTimeoutPromise(jobId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Job ${jobId} timed out after ${this.MAX_PROCESSING_TIME}ms`));
      }, this.MAX_PROCESSING_TIME);
    });
  }

  /**
   * Check if error is fatal (shouldn't retry)
   */
  private static isFatalError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('invalid url') || 
             message.includes('domain blocked') ||
             message.includes('permission denied');
    }
    return false;
  }

  /**
   * Update success metrics
   */
  private static updateSuccessMetrics(processingTime: number): void {
    this.metrics.jobsProcessed++;
    this.metrics.jobsSucceeded++;
    this.metrics.avgProcessingTime = (this.metrics.avgProcessingTime + processingTime) / 2;
    this.metrics.lastActivity = new Date().toISOString();
  }

  /**
   * Update failure metrics
   */
  private static updateFailureMetrics(): void {
    this.metrics.jobsProcessed++;
    this.metrics.jobsFailed++;
    this.metrics.lastActivity = new Date().toISOString();
  }

  /**
   * Get worker metrics
   */
  static getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get worker status
   */
  static getStatus(): { isRunning: boolean; workerId: string; metrics: WorkerMetrics } {
    return {
      isRunning: this.isRunning,
      workerId: this.WORKER_ID,
      metrics: this.getMetrics()
    };
  }
}
