
import { supabase } from '@/integrations/supabase/client';
import { WorkflowEngine } from '../WorkflowEngine';
import { BackgroundJob } from '../types';

/**
 * Base class for background job processors
 */
export abstract class BackgroundJobProcessor {
  protected abstract jobType: string;
  protected isRunning: boolean = false;
  protected processingInterval?: NodeJS.Timeout;

  /**
   * Start the processor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`${this.jobType} processor already running`);
      return;
    }

    this.isRunning = true;
    console.log(`🚀 Starting ${this.jobType} processor`);

    // Process jobs immediately, then at intervals
    await this.processJobs();
    this.processingInterval = setInterval(() => {
      this.processJobs().catch(error => {
        console.error(`❌ Error in ${this.jobType} processor:`, error);
      });
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop the processor
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.isRunning = false;
    console.log(`🛑 Stopped ${this.jobType} processor`);
  }

  /**
   * Process pending jobs
   */
  private async processJobs(): Promise<void> {
    try {
      const jobs = await this.getNextJobs();
      
      for (const job of jobs) {
        try {
          await this.claimJob(job.id);
          await this.processJob(job);
          await WorkflowEngine.updateJobStatus(job.id, 'completed');
          console.log(`✅ Completed ${this.jobType} job: ${job.id}`);
        } catch (error) {
          console.error(`❌ Failed ${this.jobType} job ${job.id}:`, error);
          
          const newAttempts = job.attempts + 1;
          if (newAttempts >= job.max_attempts) {
            await WorkflowEngine.updateJobStatus(
              job.id, 
              'failed', 
              error instanceof Error ? error.message : 'Unknown error'
            );
          } else {
            // Reset to pending for retry
            await supabase
              .from('background_jobs')
              .update({
                status: 'pending',
                attempts: newAttempts,
                error_message: error instanceof Error ? error.message : 'Unknown error',
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${this.jobType} jobs:`, error);
    }
  }

  /**
   * Get next jobs to process
   */
  private async getNextJobs(limit: number = 5): Promise<BackgroundJob[]> {
    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('job_type', this.jobType)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error(`Error fetching ${this.jobType} jobs:`, error);
      return [];
    }

    return (data || []).map(job => ({
      id: job.id as string,
      job_type: job.job_type as string,
      source_id: job.source_id as string,
      page_id: job.page_id as string | null,
      job_key: job.job_key as string | null,
      priority: job.priority as number,
      payload: job.payload as Record<string, any>,
      status: job.status as 'pending' | 'processing' | 'completed' | 'failed',
      attempts: job.attempts as number,
      max_attempts: job.max_attempts as number,
      scheduled_at: job.scheduled_at as string,
      started_at: job.started_at as string | null,
      completed_at: job.completed_at as string | null,
      error_message: job.error_message as string | null,
      created_at: job.created_at as string,
      updated_at: job.updated_at as string
    }));
  }

  /**
   * Claim a job for processing
   */
  private async claimJob(jobId: string): Promise<void> {
    await WorkflowEngine.updateJobStatus(jobId, 'processing');
  }

  /**
   * Process a specific job - to be implemented by subclasses
   */
  protected abstract processJob(job: BackgroundJob): Promise<void>;

  /**
   * Get processor status
   */
  getStatus(): { jobType: string; isRunning: boolean } {
    return {
      jobType: this.jobType,
      isRunning: this.isRunning
    };
  }
}
