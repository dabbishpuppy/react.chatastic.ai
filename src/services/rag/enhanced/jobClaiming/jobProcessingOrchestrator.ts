
import { JobClaimingCore } from './jobClaimingCore';
import { JobStatusManager } from './jobStatusManager';
import { ClaimingStatsManager } from './claimingStatsManager';
import type { ProcessingOptions, ProcessingStats } from '../types/jobClaimingTypes';

export class JobProcessingOrchestrator {
  /**
   * Process jobs with atomic claiming
   */
  static async processJobsAtomically(
    jobProcessor: (job: any) => Promise<boolean>,
    options: ProcessingOptions = {}
  ): Promise<ProcessingStats> {
    const {
      maxJobs = 10,
      jobTypes = ['process_page'],
      workerId = `worker-${Date.now()}`,
      timeoutMs = 5 * 60 * 1000
    } = options;

    const stats: ProcessingStats = { processed: 0, failed: 0, conflicts: 0 };

    // Get available jobs
    const jobs = await JobClaimingCore.getNextJobs(maxJobs, jobTypes, workerId);

    if (jobs.length === 0) {
      console.log('📭 No jobs available for processing');
      return stats;
    }

    console.log(`🚀 Processing ${jobs.length} jobs atomically with worker ${workerId}`);

    // Process each job with atomic claiming
    for (const job of jobs) {
      try {
        // Attempt to claim the job
        const startTime = Date.now();
        ClaimingStatsManager.incrementTotalClaims();
        
        const claimed = await JobClaimingCore.claimJob(job.id, workerId);
        
        const claimTime = Date.now() - startTime;
        ClaimingStatsManager.updateClaimTiming(claimTime);
        
        if (!claimed) {
          ClaimingStatsManager.incrementConflictedClaims();
          stats.conflicts++;
          continue;
        }

        ClaimingStatsManager.incrementSuccessfulClaims();

        // Set up timeout for job processing
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Job processing timeout')), timeoutMs);
        });

        try {
          // Process the job with timeout protection
          const processingPromise = jobProcessor(job);
          const success = await Promise.race([processingPromise, timeoutPromise]);

          if (success) {
            stats.processed++;
            await JobStatusManager.markJobCompleted(job.id);
          } else {
            stats.failed++;
            await JobStatusManager.markJobFailed(job.id, 'Job processor returned false');
          }

        } catch (processingError) {
          console.error(`❌ Job ${job.id} processing failed:`, processingError);
          stats.failed++;
          await JobStatusManager.markJobFailed(job.id, processingError.message);
        }

      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        ClaimingStatsManager.incrementFailedClaims();
        stats.failed++;
      }
    }

    console.log(`✅ Atomic processing completed:`, stats);
    return stats;
  }
}
