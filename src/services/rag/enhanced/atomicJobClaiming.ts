
import { supabase } from "@/integrations/supabase/client";

export class AtomicJobClaiming {
  /**
   * Atomically claim a batch of jobs to prevent race conditions
   */
  static async claimJobBatch(
    jobIds: string[],
    workerId: string,
    maxJobs: number = 50
  ): Promise<{ claimedJobs: any[]; conflictCount: number }> {
    if (jobIds.length === 0) {
      return { claimedJobs: [], conflictCount: 0 };
    }

    // Limit batch size to prevent oversized transactions
    const batchIds = jobIds.slice(0, maxJobs);
    const startTime = Date.now();

    try {
      console.log(`🔒 Attempting to claim ${batchIds.length} jobs for worker: ${workerId}`);

      // Use atomic update with WHERE clause to prevent race conditions
      const { data: claimedJobs, error } = await supabase
        .from('background_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Store worker ID in metadata by merging with existing payload
          payload: { worker_id: workerId }
        })
        .in('id', batchIds)
        .eq('status', 'pending') // Only claim if still pending
        .lte('scheduled_at', new Date().toISOString()) // Only claim if scheduled time has passed
        .select();

      const claimTime = Date.now() - startTime;
      const claimedCount = claimedJobs?.length || 0;
      const conflictCount = batchIds.length - claimedCount;

      if (error) {
        console.error('❌ Job claiming failed:', error);
        throw error;
      }

      console.log(`✅ Claimed ${claimedCount}/${batchIds.length} jobs in ${claimTime}ms (${conflictCount} conflicts)`);

      return {
        claimedJobs: claimedJobs || [],
        conflictCount
      };
    } catch (error) {
      console.error('❌ Atomic job claiming failed:', error);
      throw error;
    }
  }

  /**
   * Safely release claimed jobs back to pending state
   */
  static async releaseJobs(
    jobIds: string[],
    reason: string = 'Worker failure'
  ): Promise<void> {
    if (jobIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          started_at: null,
          error_message: `Released: ${reason}`,
          scheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', jobIds)
        .eq('status', 'processing');

      if (error) {
        console.error('❌ Job release failed:', error);
        throw error;
      }

      console.log(`🔓 Released ${jobIds.length} jobs: ${reason}`);
    } catch (error) {
      console.error('❌ Failed to release jobs:', error);
      throw error;
    }
  }

  /**
   * Get optimal batch size based on current system load
   */
  static async getOptimalBatchSize(): Promise<number> {
    try {
      // Check current system load
      const { data: metrics, error } = await supabase
        .from('background_jobs')
        .select('status')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) {
        console.warn('Could not fetch metrics for batch sizing, using default');
        return 50;
      }

      const processing = metrics.filter(m => m.status === 'processing').length;
      const pending = metrics.filter(m => m.status === 'pending').length;

      // Adaptive batch sizing based on load
      if (processing > 1000) {
        return 25; // Reduce batch size under high load
      } else if (processing < 100 && pending > 500) {
        return 100; // Increase batch size when queue is backing up
      } else {
        return 50; // Default batch size
      }
    } catch (error) {
      console.warn('Error calculating optimal batch size:', error);
      return 50;
    }
  }

  /**
   * Check for and resolve job claiming conflicts
   */
  static async resolveClaimingConflicts(): Promise<number> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      // Find jobs that have been processing too long (likely orphaned)
      const { data: orphanedJobs, error } = await supabase
        .from('background_jobs')
        .select('id')
        .eq('status', 'processing')
        .lt('started_at', fiveMinutesAgo);

      if (error) {
        console.error('Error finding orphaned jobs:', error);
        return 0;
      }

      if (!orphanedJobs || orphanedJobs.length === 0) {
        return 0;
      }

      // Release orphaned jobs
      await this.releaseJobs(
        orphanedJobs.map(j => j.id),
        'Orphaned job cleanup'
      );

      console.log(`🧹 Resolved ${orphanedJobs.length} claiming conflicts`);
      return orphanedJobs.length;
    } catch (error) {
      console.error('❌ Failed to resolve claiming conflicts:', error);
      return 0;
    }
  }

  /**
   * Get claiming statistics for monitoring
   */
  static async getClaimingStats(): Promise<{
    totalJobs: number;
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    avgClaimTime: number;
    conflictRate: number;
  }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: jobs, error } = await supabase
        .from('background_jobs')
        .select('status, created_at, started_at')
        .gte('created_at', oneHourAgo);

      if (error) {
        throw error;
      }

      const totalJobs = jobs.length;
      const pending = jobs.filter(j => j.status === 'pending').length;
      const processing = jobs.filter(j => j.status === 'processing').length;
      const completed = jobs.filter(j => j.status === 'completed').length;
      const failed = jobs.filter(j => j.status === 'failed' || j.status === 'dead_letter').length;

      // Calculate average claim time
      const claimedJobs = jobs.filter(j => j.started_at && j.created_at);
      const avgClaimTime = claimedJobs.length > 0
        ? claimedJobs.reduce((sum, job) => {
            const created = new Date(job.created_at).getTime();
            const started = new Date(job.started_at).getTime();
            return sum + (started - created);
          }, 0) / claimedJobs.length
        : 0;

      // Estimate conflict rate (jobs that took longer than expected to claim)
      const slowClaims = claimedJobs.filter(job => {
        const created = new Date(job.created_at).getTime();
        const started = new Date(job.started_at).getTime();
        return (started - created) > 5000; // More than 5 seconds
      }).length;
      
      const conflictRate = claimedJobs.length > 0 ? slowClaims / claimedJobs.length : 0;

      return {
        totalJobs,
        pendingJobs: pending,
        processingJobs: processing,
        completedJobs: completed,
        failedJobs: failed,
        avgClaimTime,
        conflictRate
      };
    } catch (error) {
      console.error('❌ Failed to get claiming stats:', error);
      return {
        totalJobs: 0,
        pendingJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        avgClaimTime: 0,
        conflictRate: 0
      };
    }
  }
}
