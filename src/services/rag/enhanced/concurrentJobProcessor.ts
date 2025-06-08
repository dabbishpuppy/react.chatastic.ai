
import { supabase } from "@/integrations/supabase/client";
import { JobClaimingCore } from './jobClaiming/jobClaimingCore';
import { JobStatusManager } from './jobClaiming/jobStatusManager';

export interface ConcurrentProcessingOptions {
  maxConcurrentJobs: number;
  jobTypes: string[];
  workerId: string;
  batchSize: number;
  timeoutMs: number;
}

export interface ProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  processingTimeMs: number;
}

export class ConcurrentJobProcessor {
  private static readonly DEFAULT_OPTIONS: ConcurrentProcessingOptions = {
    maxConcurrentJobs: 5,
    jobTypes: ['process_page'],
    workerId: `worker-${Date.now()}`,
    batchSize: 10,
    timeoutMs: 10 * 60 * 1000 // 10 minutes
  };

  /**
   * Process jobs concurrently with improved efficiency
   */
  static async processConcurrentJobs(
    jobProcessor: (job: any) => Promise<boolean>,
    options: Partial<ConcurrentProcessingOptions> = {}
  ): Promise<ProcessingResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    console.log(`🚀 Starting concurrent job processing with ${config.maxConcurrentJobs} workers`);

    const result: ProcessingResult = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      processingTimeMs: 0
    };

    try {
      // Get available jobs in batch
      const availableJobs = await JobClaimingCore.getNextJobs(
        config.batchSize,
        config.jobTypes,
        config.workerId
      );

      if (availableJobs.length === 0) {
        console.log('📭 No jobs available for processing');
        return result;
      }

      console.log(`📋 Found ${availableJobs.length} jobs to process`);

      // Process jobs in concurrent batches
      const jobBatches = this.createBatches(availableJobs, config.maxConcurrentJobs);

      for (const batch of jobBatches) {
        const batchPromises = batch.map(job => 
          this.processJobWithClaiming(job, jobProcessor, config.workerId, config.timeoutMs)
        );

        const batchResults = await Promise.allSettled(batchPromises);

        // Aggregate results
        batchResults.forEach((promiseResult, index) => {
          result.totalProcessed++;
          
          if (promiseResult.status === 'fulfilled') {
            const jobResult = promiseResult.value;
            if (jobResult.success) {
              result.successful++;
            } else if (jobResult.skipped) {
              result.skipped++;
            } else {
              result.failed++;
            }
          } else {
            result.failed++;
            console.error(`❌ Job ${batch[index].id} failed:`, promiseResult.reason);
          }
        });

        console.log(`✅ Processed batch: ${batch.length} jobs`);
      }

    } catch (error) {
      console.error('❌ Concurrent processing failed:', error);
    }

    result.processingTimeMs = Date.now() - startTime;
    
    console.log(`🎯 Concurrent processing completed:`, result);
    return result;
  }

  /**
   * Process a single job with atomic claiming
   */
  private static async processJobWithClaiming(
    job: any,
    jobProcessor: (job: any) => Promise<boolean>,
    workerId: string,
    timeoutMs: number
  ): Promise<{ success: boolean; skipped: boolean; error?: string }> {
    const jobStartTime = Date.now();

    try {
      // Attempt to claim the job atomically
      const claimed = await JobClaimingCore.claimJob(job.id, workerId);
      
      if (!claimed) {
        return { success: false, skipped: true };
      }

      // Set up timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job processing timeout')), timeoutMs);
      });

      try {
        // Process the job with timeout protection
        const processingPromise = jobProcessor(job);
        const success = await Promise.race([processingPromise, timeoutPromise]);

        const processingTime = Date.now() - jobStartTime;

        if (success) {
          await JobStatusManager.markJobCompleted(job.id, { processingTimeMs: processingTime });
          return { success: true, skipped: false };
        } else {
          await JobStatusManager.markJobFailed(job.id, 'Job processor returned false');
          return { success: false, skipped: false };
        }

      } catch (processingError) {
        const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error';
        await JobStatusManager.markJobFailed(job.id, errorMessage);
        return { success: false, skipped: false, error: errorMessage };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown claiming error';
      console.error(`❌ Error processing job ${job.id}:`, error);
      return { success: false, skipped: false, error: errorMessage };
    }
  }

  /**
   * Create batches for concurrent processing
   */
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get processing statistics
   */
  static async getProcessingStats(): Promise<{
    queueDepth: number;
    activeWorkers: number;
    avgProcessingTime: number;
    successRate: number;
  }> {
    try {
      // Get queue depth
      const { count: queueDepth } = await supabase
        .from('background_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get active workers
      const { data: activeJobs } = await supabase
        .from('background_jobs')
        .select('worker_id')
        .eq('status', 'processing')
        .not('worker_id', 'is', null);

      const uniqueWorkers = new Set(activeJobs?.map(job => job.worker_id) || []);

      // Get recent performance stats
      const { data: recentJobs } = await supabase
        .from('background_jobs')
        .select('status, processing_time_ms')
        .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .in('status', ['completed', 'failed']);

      let avgProcessingTime = 0;
      let successRate = 0;

      if (recentJobs && recentJobs.length > 0) {
        const completedJobs = recentJobs.filter(job => job.status === 'completed');
        const totalProcessingTime = completedJobs.reduce((sum, job) => sum + (job.processing_time_ms || 0), 0);
        
        avgProcessingTime = completedJobs.length > 0 ? totalProcessingTime / completedJobs.length : 0;
        successRate = completedJobs.length / recentJobs.length;
      }

      return {
        queueDepth: queueDepth || 0,
        activeWorkers: uniqueWorkers.size,
        avgProcessingTime,
        successRate
      };

    } catch (error) {
      console.error('❌ Error getting processing stats:', error);
      return {
        queueDepth: 0,
        activeWorkers: 0,
        avgProcessingTime: 0,
        successRate: 0
      };
    }
  }
}
