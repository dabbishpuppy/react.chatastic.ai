
import { supabase } from '@/integrations/supabase/client';

interface DeadLetterJob {
  id: string;
  originalJobId: string;
  jobType: string;
  sourceId: string;
  pageId?: string;
  payload: any;
  failureReason: string;
  failureCount: number;
  lastFailureAt: string;
  canRetry: boolean;
  created_at: string;
}

export class DeadLetterQueue {
  private static readonly MAX_FAILURE_COUNT = 5;

  /**
   * Move a permanently failed job to the dead letter queue
   */
  static async moveToDeadLetter(
    jobId: string,
    jobType: string,
    sourceId: string,
    failureReason: string,
    payload: any,
    pageId?: string
  ): Promise<void> {
    console.log(`📬 Moving job ${jobId} to dead letter queue: ${failureReason}`);

    try {
      // Insert into dead letter queue (we'll use a simple table approach)
      const { error: insertError } = await supabase
        .from('background_jobs')
        .update({
          status: 'dead_letter',
          error_message: `Dead Letter: ${failureReason}`,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (insertError) {
        console.error('Error moving job to dead letter queue:', insertError);
        throw insertError;
      }

      console.log(`✅ Job ${jobId} moved to dead letter queue`);
    } catch (error) {
      console.error('Failed to move job to dead letter queue:', error);
      throw error;
    }
  }

  /**
   * Get all dead letter jobs
   */
  static async getDeadLetterJobs(): Promise<any[]> {
    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'dead_letter')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching dead letter jobs:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Retry a job from the dead letter queue
   */
  static async retryDeadLetterJob(jobId: string): Promise<void> {
    console.log(`🔄 Retrying dead letter job: ${jobId}`);

    try {
      const { error } = await supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          attempts: 0,
          error_message: null,
          scheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'dead_letter');

      if (error) {
        throw error;
      }

      console.log(`✅ Dead letter job ${jobId} moved back to pending`);
    } catch (error) {
      console.error('Error retrying dead letter job:', error);
      throw error;
    }
  }

  /**
   * Check if a job should be moved to dead letter queue
   */
  static shouldMoveToDeadLetter(attempts: number, maxAttempts: number): boolean {
    return attempts >= maxAttempts;
  }

  /**
   * Clean up old dead letter jobs (older than 30 days)
   */
  static async cleanupOldDeadLetterJobs(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('background_jobs')
      .delete()
      .eq('status', 'dead_letter')
      .lt('updated_at', thirtyDaysAgo);

    if (error) {
      console.error('Error cleaning up old dead letter jobs:', error);
      throw error;
    }

    const deletedCount = data ? data.length : 0;
    console.log(`🧹 Cleaned up ${deletedCount} old dead letter jobs`);
    return deletedCount;
  }

  /**
   * Get dead letter queue statistics
   */
  static async getStatistics(): Promise<{
    totalJobs: number;
    jobsByType: Record<string, number>;
    recentFailures: number;
  }> {
    const { data, error } = await supabase
      .from('background_jobs')
      .select('job_type, updated_at')
      .eq('status', 'dead_letter');

    if (error) {
      console.error('Error fetching dead letter statistics:', error);
      throw error;
    }

    const jobs = data || [];
    const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const jobsByType = jobs.reduce((acc, job) => {
      acc[job.job_type] = (acc[job.job_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentFailures = jobs.filter(job => job.updated_at > recentThreshold).length;

    return {
      totalJobs: jobs.length,
      jobsByType,
      recentFailures
    };
  }
}
