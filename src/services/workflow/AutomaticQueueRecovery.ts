
import { supabase } from '@/integrations/supabase/client';
import { JobHeartbeat } from './JobHeartbeat';
import { DeadLetterQueue } from './DeadLetterQueue';

export class AutomaticQueueRecovery {
  private static isRunning = false;
  private static recoveryInterval: number | null = null;
  private static readonly RECOVERY_CHECK_INTERVAL = 60000; // 1 minute
  private static readonly PROCESSOR_RESTART_THRESHOLD = 5; // Failed jobs threshold

  /**
   * Start the automatic recovery system
   */
  static startRecoverySystem(): void {
    if (this.isRunning) {
      console.log('🔄 Recovery system already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting automatic queue recovery system');

    // Start heartbeat monitoring
    JobHeartbeat.startHeartbeatMonitoring();

    // Start recovery checks
    this.recoveryInterval = window.setInterval(() => {
      this.performRecoveryCheck();
    }, this.RECOVERY_CHECK_INTERVAL);
  }

  /**
   * Stop the automatic recovery system
   */
  static stopRecoverySystem(): void {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
    
    JobHeartbeat.stopHeartbeatMonitoring();
    this.isRunning = false;
    console.log('🛑 Stopped automatic recovery system');
  }

  /**
   * Perform comprehensive recovery check
   */
  private static async performRecoveryCheck(): Promise<void> {
    try {
      console.log('🔍 Performing recovery check...');

      // 1. Check for stuck jobs
      await this.recoverStuckJobs();

      // 2. Check for orphaned processing jobs
      await this.recoverOrphanedJobs();

      // 3. Check for failed jobs that should be retried
      await this.retryFailedJobs();

      // 4. Check queue processor health
      await this.checkProcessorHealth();

      // 5. Clean up dead letter queue
      await this.cleanupDeadLetterQueue();

      console.log('✅ Recovery check completed');
    } catch (error) {
      console.error('❌ Error during recovery check:', error);
    }
  }

  /**
   * Recover jobs that are stuck in processing status
   */
  private static async recoverStuckJobs(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: stuckJobs, error } = await supabase
      .from('background_jobs')
      .select('id, job_type, attempts, max_attempts')
      .eq('status', 'processing')
      .lt('started_at', fiveMinutesAgo);

    if (error) {
      console.error('Error finding stuck jobs:', error);
      return;
    }

    for (const job of stuckJobs || []) {
      console.warn(`🔄 Recovering stuck job: ${job.id}`);
      
      if (job.attempts >= job.max_attempts) {
        // Move to dead letter queue
        await DeadLetterQueue.moveToDeadLetter(
          job.id,
          job.job_type,
          job.id, // Using job.id as sourceId for now
          'Job stuck in processing status',
          {}
        );
      } else {
        // Reset to pending
        await supabase
          .from('background_jobs')
          .update({
            status: 'pending',
            started_at: null,
            error_message: 'Recovered from stuck state',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }

    if (stuckJobs && stuckJobs.length > 0) {
      console.log(`🔄 Recovered ${stuckJobs.length} stuck jobs`);
    }
  }

  /**
   * Recover orphaned jobs (processing without heartbeat)
   */
  private static async recoverOrphanedJobs(): Promise<void> {
    const heartbeatStats = JobHeartbeat.getStatistics();
    
    // Get all processing jobs
    const { data: processingJobs, error } = await supabase
      .from('background_jobs')
      .select('id')
      .eq('status', 'processing');

    if (error || !processingJobs) {
      return;
    }

    // Find jobs without heartbeat registration
    const orphanedJobs = processingJobs.filter(job => 
      !Array.from(JobHeartbeat['heartbeats'].keys()).includes(job.id)
    );

    for (const job of orphanedJobs) {
      console.warn(`👻 Found orphaned job: ${job.id}`);
      
      // Reset to pending
      await supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          started_at: null,
          error_message: 'Recovered orphaned job',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
    }

    if (orphanedJobs.length > 0) {
      console.log(`👻 Recovered ${orphanedJobs.length} orphaned jobs`);
    }
  }

  /**
   * Retry failed jobs with exponential backoff
   */
  private static async retryFailedJobs(): Promise<void> {
    const { data: failedJobs, error } = await supabase
      .from('background_jobs')
      .select('id, attempts, max_attempts, updated_at')
      .eq('status', 'failed')
      .lt('attempts', 3); // Only retry if under max attempts

    if (error || !failedJobs) {
      return;
    }

    for (const job of failedJobs) {
      // Calculate retry delay based on attempts (exponential backoff)
      const retryDelay = Math.pow(2, job.attempts) * 60 * 1000; // 1min, 2min, 4min...
      const canRetryAt = new Date(new Date(job.updated_at).getTime() + retryDelay);
      
      if (new Date() >= canRetryAt) {
        console.log(`🔄 Retrying failed job: ${job.id} (attempt ${job.attempts + 1})`);
        
        await supabase
          .from('background_jobs')
          .update({
            status: 'pending',
            scheduled_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }
  }

  /**
   * Check if queue processor is healthy and restart if needed
   */
  private static async checkProcessorHealth(): Promise<void> {
    // Check for accumulating failed jobs as a sign of processor issues
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentFailures, error } = await supabase
      .from('background_jobs')
      .select('id')
      .eq('status', 'failed')
      .gte('updated_at', oneHourAgo);

    if (error) {
      return;
    }

    if (recentFailures && recentFailures.length > this.PROCESSOR_RESTART_THRESHOLD) {
      console.warn(`⚠️ High failure rate detected: ${recentFailures.length} failures in the last hour`);
      
      // Here you could trigger processor restart logic
      // For now, we'll just log the issue
      await this.logProcessorIssue(`High failure rate: ${recentFailures.length} failures`);
    }
  }

  /**
   * Clean up old dead letter queue entries
   */
  private static async cleanupDeadLetterQueue(): Promise<void> {
    try {
      const cleanedCount = await DeadLetterQueue.cleanupOldDeadLetterJobs();
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old dead letter jobs`);
      }
    } catch (error) {
      console.error('Error cleaning up dead letter queue:', error);
    }
  }

  /**
   * Log processor issues for monitoring
   */
  private static async logProcessorIssue(issue: string): Promise<void> {
    console.error(`🚨 Processor Issue: ${issue}`);
    
    // Here you could send alerts, write to monitoring systems, etc.
    // For now, we'll just ensure it's logged prominently
  }

  /**
   * Get recovery system status
   */
  static getRecoveryStatus(): {
    isRunning: boolean;
    heartbeatStats: any;
    lastCheckTime: Date;
  } {
    return {
      isRunning: this.isRunning,
      heartbeatStats: JobHeartbeat.getStatistics(),
      lastCheckTime: new Date()
    };
  }

  /**
   * Force a manual recovery check
   */
  static async forceRecoveryCheck(): Promise<void> {
    console.log('🔄 Forcing manual recovery check...');
    await this.performRecoveryCheck();
  }
}
