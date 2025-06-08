
import { supabase } from "@/integrations/supabase/client";

export interface ClaimingStats {
  totalClaims: number;
  successfulClaims: number;
  failedClaims: number;
  conflictedClaims: number;
  avgClaimTime: number;
  conflictRate: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
}

export class AtomicJobClaiming {
  private static claimingStats: ClaimingStats = {
    totalClaims: 0,
    successfulClaims: 0,
    failedClaims: 0,
    conflictedClaims: 0,
    avgClaimTime: 0,
    conflictRate: 0,
    pendingJobs: 0,
    processingJobs: 0,
    completedJobs: 0,
    failedJobs: 0
  };

  /**
   * Atomically claim a job for processing
   */
  static async claimJob(jobId: string, workerId: string = 'default'): Promise<boolean> {
    const startTime = Date.now();
    this.claimingStats.totalClaims++;

    try {
      const { data, error } = await supabase
        .from('background_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          worker_id: workerId
        })
        .eq('id', jobId)
        .eq('status', 'pending') // Critical: only claim if still pending
        .select();

      const claimTime = Date.now() - startTime;
      this.updateClaimTiming(claimTime);

      if (error) {
        console.error('❌ Job claiming error:', error);
        this.claimingStats.failedClaims++;
        return false;
      }

      if (!data || data.length === 0) {
        // Job was already claimed by another worker
        console.log(`⚠️ Job ${jobId} already claimed by another worker`);
        this.claimingStats.conflictedClaims++;
        return false;
      }

      console.log(`🔒 Successfully claimed job ${jobId} in ${claimTime}ms`);
      this.claimingStats.successfulClaims++;
      return true;

    } catch (error) {
      console.error(`❌ Failed to claim job ${jobId}:`, error);
      this.claimingStats.failedClaims++;
      return false;
    }
  }

  /**
   * Release a job back to pending state
   */
  static async releaseJob(jobId: string, reason: string = 'Released by worker'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          started_at: null,
          worker_id: null,
          error_message: reason,
          updated_at: new Date().toISOString(),
          scheduled_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) {
        console.error(`❌ Failed to release job ${jobId}:`, error);
        return false;
      }

      console.log(`🔓 Released job ${jobId}: ${reason}`);
      return true;

    } catch (error) {
      console.error(`❌ Error releasing job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get next available jobs for processing
   */
  static async getNextJobs(
    limit: number = 10,
    jobTypes: string[] = ['process_page'],
    workerId: string = 'default'
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('background_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (jobTypes.length > 0) {
        query = query.in('job_type', jobTypes);
      }

      const { data: jobs, error } = await query;

      if (error) {
        console.error('❌ Error fetching next jobs:', error);
        return [];
      }

      console.log(`📋 Found ${jobs?.length || 0} jobs available for processing`);
      return jobs || [];

    } catch (error) {
      console.error('❌ Error in getNextJobs:', error);
      return [];
    }
  }

  /**
   * Process jobs with atomic claiming
   */
  static async processJobsAtomically(
    jobProcessor: (job: any) => Promise<boolean>,
    options: {
      maxJobs?: number;
      jobTypes?: string[];
      workerId?: string;
      timeoutMs?: number;
    } = {}
  ): Promise<{ processed: number; failed: number; conflicts: number }> {
    const {
      maxJobs = 10,
      jobTypes = ['process_page'],
      workerId = `worker-${Date.now()}`,
      timeoutMs = 5 * 60 * 1000
    } = options;

    const stats = { processed: 0, failed: 0, conflicts: 0 };

    // Get available jobs
    const jobs = await this.getNextJobs(maxJobs, jobTypes, workerId);

    if (jobs.length === 0) {
      console.log('📭 No jobs available for processing');
      return stats;
    }

    console.log(`🚀 Processing ${jobs.length} jobs atomically with worker ${workerId}`);

    // Process each job with atomic claiming
    for (const job of jobs) {
      try {
        // Attempt to claim the job
        const claimed = await this.claimJob(job.id, workerId);
        
        if (!claimed) {
          stats.conflicts++;
          continue;
        }

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
            await this.markJobCompleted(job.id);
          } else {
            stats.failed++;
            await this.markJobFailed(job.id, 'Job processor returned false');
          }

        } catch (processingError) {
          console.error(`❌ Job ${job.id} processing failed:`, processingError);
          stats.failed++;
          await this.markJobFailed(job.id, processingError.message);
        }

      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        stats.failed++;
      }
    }

    console.log(`✅ Atomic processing completed:`, stats);
    return stats;
  }

  /**
   * Mark job as completed
   */
  private static async markJobCompleted(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('background_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error(`❌ Failed to mark job ${jobId} as completed:`, error);
    } else {
      console.log(`✅ Job ${jobId} marked as completed`);
    }
  }

  /**
   * Mark job as failed
   */
  private static async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
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
      console.error(`❌ Failed to mark job ${jobId} as failed:`, error);
    } else {
      console.log(`💀 Job ${jobId} marked as failed: ${errorMessage}`);
    }
  }

  /**
   * Update claiming timing statistics
   */
  private static updateClaimTiming(claimTime: number): void {
    const totalClaims = this.claimingStats.totalClaims;
    const currentAvg = this.claimingStats.avgClaimTime;
    
    this.claimingStats.avgClaimTime = ((currentAvg * (totalClaims - 1)) + claimTime) / totalClaims;
    this.claimingStats.conflictRate = this.claimingStats.conflictedClaims / totalClaims;
  }

  /**
   * Get current claiming statistics
   */
  static async getClaimingStats(): Promise<ClaimingStats> {
    try {
      // Update job counts from database
      const { data: jobCounts } = await supabase
        .from('background_jobs')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (jobCounts) {
        this.claimingStats.pendingJobs = jobCounts.filter(j => j.status === 'pending').length;
        this.claimingStats.processingJobs = jobCounts.filter(j => j.status === 'processing').length;
        this.claimingStats.completedJobs = jobCounts.filter(j => j.status === 'completed').length;
        this.claimingStats.failedJobs = jobCounts.filter(j => j.status === 'failed').length;
      }

      return { ...this.claimingStats };
    } catch (error) {
      console.error('❌ Error getting claiming stats:', error);
      return { ...this.claimingStats };
    }
  }

  /**
   * Reset statistics (useful for testing or monitoring resets)
   */
  static resetStats(): void {
    this.claimingStats = {
      totalClaims: 0,
      successfulClaims: 0,
      failedClaims: 0,
      conflictedClaims: 0,
      avgClaimTime: 0,
      conflictRate: 0,
      pendingJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0
    };
  }
}
