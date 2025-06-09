
import { supabase } from "@/integrations/supabase/client";

export interface JobRecoveryStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  stuckJobs: number;
  recoveredJobs: number;
}

export class JobRecoveryServiceV2 {
  private static readonly STUCK_THRESHOLD_MS = 2 * 60 * 1000; // Reduced to 2 minutes for faster recovery

  /**
   * Get comprehensive job statistics for a source
   */
  static async getJobStats(sourceId: string): Promise<JobRecoveryStats> {
    try {
      const { data: jobs, error } = await supabase
        .from('background_jobs')
        .select('id, status, started_at, created_at')
        .eq('source_id', sourceId);

      if (error) throw error;

      const now = Date.now();
      const stuckThreshold = now - this.STUCK_THRESHOLD_MS;

      const stats = jobs?.reduce((acc, job) => {
        acc.totalJobs++;
        
        switch (job.status) {
          case 'pending':
            acc.pendingJobs++;
            break;
          case 'processing':
            acc.processingJobs++;
            // Check if job is stuck in processing
            if (job.started_at && new Date(job.started_at).getTime() < stuckThreshold) {
              acc.stuckJobs++;
            }
            break;
          case 'completed':
            acc.completedJobs++;
            break;
          case 'failed':
            acc.failedJobs++;
            break;
        }
        
        return acc;
      }, {
        totalJobs: 0,
        pendingJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        stuckJobs: 0,
        recoveredJobs: 0
      });

      return stats || {
        totalJobs: 0,
        pendingJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        stuckJobs: 0,
        recoveredJobs: 0
      };
    } catch (error) {
      console.error('Error getting job stats:', error);
      return {
        totalJobs: 0,
        pendingJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        stuckJobs: 0,
        recoveredJobs: 0
      };
    }
  }

  /**
   * Recover stuck jobs by resetting them to pending
   */
  static async recoverStuckJobs(sourceId: string): Promise<JobRecoveryStats> {
    try {
      const stuckThreshold = new Date(Date.now() - this.STUCK_THRESHOLD_MS).toISOString();

      // Find stuck jobs (processing for too long)
      const { data: stuckJobs, error: findError } = await supabase
        .from('background_jobs')
        .select('id')
        .eq('source_id', sourceId)
        .eq('status', 'processing')
        .lt('started_at', stuckThreshold);

      if (findError) throw findError;

      let recoveredCount = 0;

      if (stuckJobs && stuckJobs.length > 0) {
        // Reset stuck jobs to pending
        const { error: updateError } = await supabase
          .from('background_jobs')
          .update({
            status: 'pending',
            started_at: null,
            error_message: 'Auto-recovered from stuck state (optimized)',
            updated_at: new Date().toISOString()
          })
          .in('id', stuckJobs.map(j => j.id));

        if (updateError) throw updateError;
        recoveredCount = stuckJobs.length;

        console.log(`🔧 Recovered ${recoveredCount} stuck jobs for source: ${sourceId}`);
      }

      // Get updated stats
      const stats = await this.getJobStats(sourceId);
      stats.recoveredJobs = recoveredCount;

      return stats;
    } catch (error) {
      console.error('Error recovering stuck jobs:', error);
      const stats = await this.getJobStats(sourceId);
      stats.recoveredJobs = 0;
      return stats;
    }
  }

  /**
   * Trigger optimized job processing for a source
   */
  static async triggerJobProcessing(sourceId: string): Promise<boolean> {
    try {
      console.log('🚀 Triggering optimized job processing for source:', sourceId);

      const { data, error } = await supabase.functions.invoke('workflow-job-processor', {
        body: {
          action: 'process_jobs',
          sourceId: sourceId,
          maxJobs: 500 // Increased batch size
        }
      });

      if (error) {
        console.error('Job processing trigger error:', error);
        return false;
      }

      console.log('✅ Optimized job processing triggered successfully:', data);
      return true;
    } catch (error) {
      console.error('Error triggering job processing:', error);
      return false;
    }
  }

  /**
   * Comprehensive recovery - recover stuck jobs and trigger processing
   */
  static async performFullRecovery(sourceId: string): Promise<JobRecoveryStats> {
    console.log('🔄 Performing optimized full job recovery for source:', sourceId);

    // Step 1: Recover stuck jobs
    const stats = await this.recoverStuckJobs(sourceId);

    // Step 2: Trigger processing for any pending jobs
    if (stats.pendingJobs > 0) {
      console.log(`🚀 Triggering optimized processing for ${stats.pendingJobs} pending jobs`);
      await this.triggerJobProcessing(sourceId);
    }

    console.log('✅ Optimized full recovery completed:', stats);
    return stats;
  }
}

