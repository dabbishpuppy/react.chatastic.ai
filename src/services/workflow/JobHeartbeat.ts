
import { supabase } from '@/integrations/supabase/client';

interface HeartbeatEntry {
  jobId: string;
  lastHeartbeat: Date;
  missedBeats: number;
}

export class JobHeartbeat {
  private static heartbeats: Map<string, HeartbeatEntry> = new Map();
  private static heartbeatInterval: number | null = null;
  private static readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private static readonly MAX_MISSED_BEATS = 3;
  private static readonly PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Start the heartbeat monitoring system
   */
  static startHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      return; // Already running
    }

    console.log('💓 Starting job heartbeat monitoring');
    
    this.heartbeatInterval = window.setInterval(() => {
      this.checkHeartbeats();
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop the heartbeat monitoring system
   */
  static stopHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.heartbeats.clear();
      console.log('🛑 Stopped job heartbeat monitoring');
    }
  }

  /**
   * Register a job for heartbeat monitoring
   */
  static registerJob(jobId: string): void {
    this.heartbeats.set(jobId, {
      jobId,
      lastHeartbeat: new Date(),
      missedBeats: 0
    });
    console.log(`💓 Registered job ${jobId} for heartbeat monitoring`);
  }

  /**
   * Send a heartbeat for a job
   */
  static sendHeartbeat(jobId: string): void {
    const entry = this.heartbeats.get(jobId);
    if (entry) {
      entry.lastHeartbeat = new Date();
      entry.missedBeats = 0;
      console.log(`💓 Heartbeat received for job ${jobId}`);
    }
  }

  /**
   * Unregister a job from heartbeat monitoring
   */
  static unregisterJob(jobId: string): void {
    this.heartbeats.delete(jobId);
    console.log(`💓 Unregistered job ${jobId} from heartbeat monitoring`);
  }

  /**
   * Check all heartbeats and handle timeouts
   */
  private static async checkHeartbeats(): Promise<void> {
    const now = new Date();
    const stuckJobs: string[] = [];

    for (const [jobId, entry] of this.heartbeats.entries()) {
      const timeSinceLastBeat = now.getTime() - entry.lastHeartbeat.getTime();
      
      if (timeSinceLastBeat > this.HEARTBEAT_INTERVAL_MS) {
        entry.missedBeats++;
        console.warn(`⚠️ Job ${jobId} missed heartbeat (${entry.missedBeats}/${this.MAX_MISSED_BEATS})`);
        
        if (entry.missedBeats >= this.MAX_MISSED_BEATS) {
          stuckJobs.push(jobId);
        }
      }
    }

    // Handle stuck jobs
    for (const jobId of stuckJobs) {
      await this.handleStuckJob(jobId);
    }

    // Also check for jobs stuck in processing status without heartbeat registration
    await this.checkProcessingTimeouts();
  }

  /**
   * Handle a stuck job that missed too many heartbeats
   */
  private static async handleStuckJob(jobId: string): Promise<void> {
    console.error(`❌ Job ${jobId} is stuck (missed ${this.MAX_MISSED_BEATS} heartbeats)`);
    
    try {
      // Reset job to pending status
      const { error } = await supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          started_at: null,
          error_message: 'Job reset due to missed heartbeats',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'processing');

      if (error) {
        console.error('Error resetting stuck job:', error);
      } else {
        console.log(`🔄 Reset stuck job ${jobId} to pending`);
      }

      // Unregister from heartbeat monitoring
      this.unregisterJob(jobId);
    } catch (error) {
      console.error('Failed to handle stuck job:', error);
    }
  }

  /**
   * Check for jobs that have been processing too long without heartbeat registration
   */
  private static async checkProcessingTimeouts(): Promise<void> {
    const timeoutThreshold = new Date(Date.now() - this.PROCESSING_TIMEOUT_MS).toISOString();

    try {
      const { data: stuckJobs, error } = await supabase
        .from('background_jobs')
        .select('id, started_at')
        .eq('status', 'processing')
        .lt('started_at', timeoutThreshold);

      if (error) {
        console.error('Error checking processing timeouts:', error);
        return;
      }

      for (const job of stuckJobs || []) {
        if (!this.heartbeats.has(job.id)) {
          console.warn(`⚠️ Found orphaned processing job: ${job.id}`);
          await this.handleStuckJob(job.id);
        }
      }
    } catch (error) {
      console.error('Error checking processing timeouts:', error);
    }
  }

  /**
   * Get heartbeat statistics
   */
  static getStatistics(): {
    activeJobs: number;
    jobsWithMissedBeats: number;
    averageMissedBeats: number;
  } {
    const jobs = Array.from(this.heartbeats.values());
    const jobsWithMissedBeats = jobs.filter(job => job.missedBeats > 0);
    const totalMissedBeats = jobs.reduce((sum, job) => sum + job.missedBeats, 0);

    return {
      activeJobs: jobs.length,
      jobsWithMissedBeats: jobsWithMissedBeats.length,
      averageMissedBeats: jobs.length > 0 ? totalMissedBeats / jobs.length : 0
    };
  }
}
