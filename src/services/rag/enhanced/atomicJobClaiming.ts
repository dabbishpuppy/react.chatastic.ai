
import { JobClaimingCore } from './jobClaiming/jobClaimingCore';
import { JobStatusManager } from './jobClaiming/jobStatusManager';
import { JobProcessingOrchestrator } from './jobClaiming/jobProcessingOrchestrator';
import { ClaimingStatsManager } from './jobClaiming/claimingStatsManager';

// Re-export types for backward compatibility
export type { ClaimingStats, ProcessingOptions, ProcessingStats } from './types/jobClaimingTypes';

export class AtomicJobClaiming {
  /**
   * Atomically claim a job for processing
   */
  static async claimJob(jobId: string, workerId: string = 'default'): Promise<boolean> {
    const startTime = Date.now();
    ClaimingStatsManager.incrementTotalClaims();

    const result = await JobClaimingCore.claimJob(jobId, workerId);
    
    const claimTime = Date.now() - startTime;
    ClaimingStatsManager.updateClaimTiming(claimTime);

    if (result) {
      ClaimingStatsManager.incrementSuccessfulClaims();
    } else {
      ClaimingStatsManager.incrementFailedClaims();
    }

    return result;
  }

  /**
   * Release a job back to pending state
   */
  static async releaseJob(jobId: string, reason: string = 'Released by worker'): Promise<boolean> {
    return JobClaimingCore.releaseJob(jobId, reason);
  }

  /**
   * Get next available jobs for processing
   */
  static async getNextJobs(
    limit: number = 10,
    jobTypes: string[] = ['process_page'],
    workerId: string = 'default'
  ): Promise<any[]> {
    return JobClaimingCore.getNextJobs(limit, jobTypes, workerId);
  }

  /**
   * Process jobs with atomic claiming
   */
  static async processJobsAtomically(
    jobProcessor: (job: any) => Promise<boolean>,
    options: import('./types/jobClaimingTypes').ProcessingOptions = {}
  ): Promise<import('./types/jobClaimingTypes').ProcessingStats> {
    return JobProcessingOrchestrator.processJobsAtomically(jobProcessor, options);
  }

  /**
   * Mark job as completed
   */
  private static async markJobCompleted(jobId: string): Promise<void> {
    return JobStatusManager.markJobCompleted(jobId);
  }

  /**
   * Mark job as failed
   */
  private static async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    return JobStatusManager.markJobFailed(jobId, errorMessage);
  }

  /**
   * Get current claiming statistics
   */
  static async getClaimingStats(): Promise<import('./types/jobClaimingTypes').ClaimingStats> {
    return ClaimingStatsManager.getClaimingStats();
  }

  /**
   * Reset statistics (useful for testing or monitoring resets)
   */
  static resetStats(): void {
    ClaimingStatsManager.resetStats();
  }
}
