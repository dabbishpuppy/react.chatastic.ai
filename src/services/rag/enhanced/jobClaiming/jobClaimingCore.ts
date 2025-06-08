
import { supabase } from "@/integrations/supabase/client";

export class JobClaimingCore {
  /**
   * Atomically claim a job for processing
   */
  static async claimJob(jobId: string, workerId: string = 'default'): Promise<boolean> {
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

      if (error) {
        console.error('❌ Job claiming error:', error);
        return false;
      }

      if (!data || data.length === 0) {
        // Job was already claimed by another worker
        console.log(`⚠️ Job ${jobId} already claimed by another worker`);
        return false;
      }

      console.log(`🔒 Successfully claimed job ${jobId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to claim job ${jobId}:`, error);
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
