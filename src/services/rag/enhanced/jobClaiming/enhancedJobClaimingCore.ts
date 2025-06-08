
import { supabase } from "@/integrations/supabase/client";

export class EnhancedJobClaimingCore {
  /**
   * Atomically claim jobs using proper database operations
   */
  static async claimJobsAtomically(
    maxJobs: number = 5,
    jobTypes: string[] = ['process_page'],
    workerId: string = 'default'
  ): Promise<any[]> {
    try {
      console.log(`🔒 Attempting to claim up to ${maxJobs} jobs atomically...`);

      // Get available jobs first
      const { data: availableJobs, error: fetchError } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .in('job_type', jobTypes)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(maxJobs);

      if (fetchError || !availableJobs) {
        console.error('❌ Error fetching available jobs:', fetchError);
        return [];
      }

      if (availableJobs.length === 0) {
        console.log('📭 No jobs available for claiming');
        return [];
      }

      // Try to claim each job atomically
      const claimedJobs: any[] = [];
      
      for (const job of availableJobs) {
        const { data: claimedJob, error: claimError } = await supabase
          .from('background_jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            attempts: job.attempts + 1
          })
          .eq('id', job.id)
          .eq('status', 'pending') // Only claim if still pending
          .select()
          .single();

        if (!claimError && claimedJob) {
          claimedJobs.push(claimedJob);
          console.log(`🔒 Successfully claimed job ${job.id}`);
        }
      }

      console.log(`✅ Successfully claimed ${claimedJobs.length} jobs atomically`);
      return claimedJobs;

    } catch (error) {
      console.error('❌ Error in atomic job claiming:', error);
      return [];
    }
  }

  /**
   * Enhanced single job claiming with retry logic
   */
  static async claimJobWithRetry(
    jobId: string,
    workerId: string = 'default',
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('background_jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            attempts: supabase.rpc('increment_retry_count', { job_ids: [jobId] })
          })
          .eq('id', jobId)
          .eq('status', 'pending') // Critical: only claim if still pending
          .select();

        if (error) {
          console.error(`❌ Job claiming attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            // Exponential backoff
            const delay = Math.pow(2, attempt - 1) * 100;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return false;
        }

        if (!data || data.length === 0) {
          console.log(`⚠️ Job ${jobId} already claimed (attempt ${attempt})`);
          return false;
        }

        console.log(`🔒 Successfully claimed job ${jobId} on attempt ${attempt}`);
        return true;

      } catch (error) {
        console.error(`❌ Exception during job claiming attempt ${attempt}:`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 100;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`❌ Failed to claim job ${jobId} after ${maxRetries} attempts`);
    return false;
  }

  /**
   * Get next available jobs with priority ordering and efficient querying
   */
  static async getNextJobsBatch(
    limit: number = 10,
    jobTypes: string[] = ['process_page'],
    workerId: string = 'default'
  ): Promise<any[]> {
    try {
      // Use an efficient query with proper indexing
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
        console.error('❌ Error fetching job batch:', error);
        return [];
      }

      console.log(`📋 Found ${jobs?.length || 0} jobs in batch for worker ${workerId}`);
      return jobs || [];

    } catch (error) {
      console.error('❌ Error in getNextJobsBatch:', error);
      return [];
    }
  }

  /**
   * Bulk release jobs back to pending state
   */
  static async releaseJobsBulk(
    jobIds: string[],
    reason: string = 'Bulk release by worker'
  ): Promise<number> {
    try {
      if (jobIds.length === 0) return 0;

      const { error, count } = await supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          started_at: null,
          error_message: reason,
          updated_at: new Date().toISOString(),
          scheduled_at: new Date().toISOString()
        })
        .in('id', jobIds);

      if (error) {
        console.error(`❌ Failed to bulk release ${jobIds.length} jobs:`, error);
        return 0;
      }

      const releasedCount = count || 0;
      console.log(`🔓 Bulk released ${releasedCount} jobs: ${reason}`);
      return releasedCount;

    } catch (error) {
      console.error(`❌ Error in bulk job release:`, error);
      return 0;
    }
  }

  /**
   * Check job claiming statistics
   */
  static async getClaimingStats(): Promise<{
    totalPending: number;
    totalProcessing: number;
    avgClaimTime: number;
    claimSuccessRate: number;
  }> {
    try {
      const [pendingResult, processingResult, recentJobs] = await Promise.all([
        supabase.from('background_jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('background_jobs').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
        supabase.from('background_jobs')
          .select('created_at, started_at, status')
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
          .in('status', ['processing', 'completed', 'failed'])
          .not('started_at', 'is', null)
      ]);

      let avgClaimTime = 0;
      let claimSuccessRate = 0;

      if (recentJobs.data && recentJobs.data.length > 0) {
        const claimTimes = recentJobs.data.map(job => 
          new Date(job.started_at!).getTime() - new Date(job.created_at).getTime()
        );
        avgClaimTime = claimTimes.reduce((sum, time) => sum + time, 0) / claimTimes.length;
        
        const successfulClaims = recentJobs.data.filter(job => job.status !== 'failed').length;
        claimSuccessRate = successfulClaims / recentJobs.data.length;
      }

      return {
        totalPending: pendingResult.count || 0,
        totalProcessing: processingResult.count || 0,
        avgClaimTime,
        claimSuccessRate
      };

    } catch (error) {
      console.error('❌ Error getting claiming stats:', error);
      return {
        totalPending: 0,
        totalProcessing: 0,
        avgClaimTime: 0,
        claimSuccessRate: 0
      };
    }
  }
}
