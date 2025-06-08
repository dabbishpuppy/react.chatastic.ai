
import { supabase } from "@/integrations/supabase/client";
import { EnhancedJobClaimingCore } from './jobClaiming/enhancedJobClaimingCore';
import { fetchMaybeSingle } from '@/utils/safeSupabaseQueries';
import type { BackgroundJob } from "@/types/database";

export interface ProcessingOptions {
  maxConcurrentJobs?: number;
  jobTypes?: string[];
  workerId?: string;
  batchSize?: number;
  timeoutMs?: number;
}

export interface ProcessingStats {
  activeWorkers: number;
  avgProcessingTime: number;
  successRate: number;
  totalProcessed: number;
  totalFailed: number;
}

// Partial types for selected fields
type JobTimestampFields = Pick<BackgroundJob, 'status' | 'created_at' | 'started_at' | 'completed_at'>;

export class ConcurrentJobProcessor {
  private static activeWorkers = 0;
  private static processedJobs = 0;
  private static failedJobs = 0;
  private static totalProcessingTime = 0;

  /**
   * Process jobs concurrently with enhanced claiming
   */
  static async processConcurrentJobs(
    jobProcessor: (job: any) => Promise<boolean>,
    options: ProcessingOptions = {}
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    processingTimeMs: number;
  }> {
    const {
      maxConcurrentJobs = 5,
      jobTypes = ['process_page'],
      workerId = `enhanced-worker-${Date.now()}`,
      batchSize = 10,
      timeoutMs = 10 * 60 * 1000 // 10 minutes
    } = options;

    console.log(`🔄 Starting concurrent job processing with ${maxConcurrentJobs} workers`);
    
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    try {
      this.activeWorkers++;
      
      // Claim jobs atomically
      const claimedJobs = await EnhancedJobClaimingCore.claimJobsAtomically(
        batchSize,
        jobTypes,
        workerId
      );

      if (claimedJobs.length === 0) {
        console.log('📭 No jobs available for processing');
        return {
          processed: 0,
          successful: 0,
          failed: 0,
          processingTimeMs: Date.now() - startTime
        };
      }

      console.log(`🔒 Successfully claimed ${claimedJobs.length} jobs`);

      // Process jobs in concurrent batches
      const batches = [];
      for (let i = 0; i < claimedJobs.length; i += maxConcurrentJobs) {
        batches.push(claimedJobs.slice(i, i + maxConcurrentJobs));
      }

      for (const batch of batches) {
        console.log(`🔄 Processing batch of ${batch.length} jobs`);
        
        const batchPromises = batch.map(job => 
          this.processJobWithTimeout(job, jobProcessor, timeoutMs)
        );

        const batchResults = await Promise.allSettled(batchPromises);

        // Aggregate batch results
        batchResults.forEach((result, index) => {
          totalProcessed++;
          
          if (result.status === 'fulfilled' && result.value) {
            totalSuccessful++;
            this.processedJobs++;
          } else {
            totalFailed++;
            this.failedJobs++;
            console.error(`❌ Job ${batch[index].id} processing failed:`, 
              result.status === 'rejected' ? result.reason : 'Job processor returned false');
          }
        });

        console.log(`✅ Batch completed: ${batch.length} jobs processed`);
      }

      const processingTime = Date.now() - startTime;
      this.totalProcessingTime += processingTime;

      console.log(`✅ Concurrent processing completed: ${totalSuccessful}/${totalProcessed} successful`);

      return {
        processed: totalProcessed,
        successful: totalSuccessful,
        failed: totalFailed,
        processingTimeMs: processingTime
      };

    } catch (error) {
      console.error('❌ Concurrent job processing failed:', error);
      return {
        processed: totalProcessed,
        successful: totalSuccessful,
        failed: totalFailed,
        processingTimeMs: Date.now() - startTime
      };
    } finally {
      this.activeWorkers--;
    }
  }

  /**
   * Process single job with timeout protection
   */
  private static async processJobWithTimeout(
    job: any,
    jobProcessor: (job: any) => Promise<boolean>,
    timeoutMs: number
  ): Promise<boolean> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Job processing timeout')), timeoutMs);
    });

    const processingPromise = jobProcessor(job);

    try {
      return await Promise.race([processingPromise, timeoutPromise]);
    } catch (error) {
      console.error(`❌ Job ${job.id} processing failed:`, error);
      
      // Mark job as failed in database
      await this.markJobFailed(job.id, error instanceof Error ? error.message : 'Unknown error');
      
      return false;
    }
  }

  /**
   * Mark job as failed in database
   */
  private static async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('background_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) {
        console.error(`Failed to update job ${jobId} status:`, error);
      }
    } catch (error) {
      console.error(`Error marking job ${jobId} as failed:`, error);
    }
  }

  /**
   * Get processing statistics with comprehensive error handling
   */
  static async getProcessingStats(): Promise<ProcessingStats> {
    try {
      // Get recent job completion rates with safe queries
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      let recentJobs: JobTimestampFields[] = [];
      try {
        const { data, error } = await supabase
          .from('background_jobs')
          .select('status, created_at, started_at, completed_at')
          .gte('created_at', oneHourAgo);

        if (error) {
          console.warn('Could not fetch recent jobs for stats:', error);
        } else {
          recentJobs = data || [];
        }
      } catch (error) {
        console.warn('Error fetching recent jobs:', error);
      }

      const completedJobs = recentJobs.filter((j: JobTimestampFields) => j.status === 'completed');
      const failedJobs = recentJobs.filter((j: JobTimestampFields) => j.status === 'failed');
      const totalRecentJobs = recentJobs.length;

      let avgProcessingTime = 0;
      if (completedJobs.length > 0) {
        const processingTimes = completedJobs
          .filter((j: JobTimestampFields) => j.started_at && j.completed_at)
          .map((j: JobTimestampFields) => {
            try {
              return new Date(j.completed_at!).getTime() - new Date(j.started_at!).getTime();
            } catch (error) {
              console.warn('Invalid timestamp in job:', j);
              return 0;
            }
          })
          .filter(time => time > 0);
        
        if (processingTimes.length > 0) {
          avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
        }
      }

      const successRate = totalRecentJobs > 0 
        ? completedJobs.length / totalRecentJobs 
        : 1.0; // Default to perfect if no recent jobs

      return {
        activeWorkers: this.activeWorkers,
        avgProcessingTime,
        successRate,
        totalProcessed: this.processedJobs,
        totalFailed: this.failedJobs
      };

    } catch (error) {
      console.error('❌ Error getting processing stats:', error);
      return {
        activeWorkers: this.activeWorkers,
        avgProcessingTime: 0,
        successRate: 1.0,
        totalProcessed: this.processedJobs,
        totalFailed: this.failedJobs
      };
    }
  }

  /**
   * Reset statistics
   */
  static resetStats(): void {
    this.processedJobs = 0;
    this.failedJobs = 0;
    this.totalProcessingTime = 0;
  }
}
