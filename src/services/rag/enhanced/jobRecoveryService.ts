
import { supabase } from "@/integrations/supabase/client";
import { fetchMaybeSingle } from "@/utils/safeSupabaseQueries";
import type { BackgroundJob, SourcePage } from "@/types/database";

export interface JobRecoveryMetrics {
  recoveredJobs: number;
  stalledJobs: number;
  orphanedJobs: number;
  totalProcessingTime: number;
}

// Partial types for selected fields
type StalledJobFields = Pick<BackgroundJob, 'id' | 'started_at'>;
type ExistingJobFields = Pick<BackgroundJob, 'page_id'>;

export class JobRecoveryService {
  private static readonly STALLED_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly ORPHANED_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Recovery stuck jobs that have been processing for too long
   */
  static async recoverStalledJobs(): Promise<JobRecoveryMetrics> {
    console.log('🔄 Starting job recovery process...');
    
    const metrics: JobRecoveryMetrics = {
      recoveredJobs: 0,
      stalledJobs: 0,
      orphanedJobs: 0,
      totalProcessingTime: 0
    };

    const startTime = Date.now();

    try {
      // Find jobs that have been "processing" for too long
      const stalledThreshold = new Date(Date.now() - this.STALLED_TIMEOUT_MS).toISOString();
      
      const { data: stalledJobs, error } = await supabase
        .from('background_jobs')
        .select('id, started_at')
        .eq('status', 'processing')
        .lt('started_at', stalledThreshold);

      if (error) {
        console.error('❌ Error finding stalled jobs:', error);
        return metrics;
      }

      metrics.stalledJobs = stalledJobs?.length || 0;

      if (stalledJobs && stalledJobs.length > 0) {
        console.log(`🔍 Found ${stalledJobs.length} stalled jobs`);

        // Reset stalled jobs back to pending
        const jobIds = stalledJobs.map((job: StalledJobFields) => job.id);
        
        const { error: updateError } = await supabase
          .from('background_jobs')
          .update({
            status: 'pending',
            started_at: null,
            error_message: 'Auto-recovered from stalled state',
            updated_at: new Date().toISOString(),
            scheduled_at: new Date().toISOString()
          })
          .in('id', jobIds);

        if (updateError) {
          console.error('❌ Error recovering stalled jobs:', updateError);
        } else {
          metrics.recoveredJobs = jobIds.length;
          console.log(`✅ Recovered ${jobIds.length} stalled jobs`);
        }
      }

      // Find orphaned source pages (completed source pages without background jobs)
      await this.recoverOrphanedSourcePages(metrics);

      metrics.totalProcessingTime = Date.now() - startTime;
      
      console.log('✅ Job recovery completed:', metrics);
      return metrics;

    } catch (error) {
      console.error('❌ Job recovery failed:', error);
      metrics.totalProcessingTime = Date.now() - startTime;
      return metrics;
    }
  }

  /**
   * Recover source pages that are stuck without proper background job processing
   */
  private static async recoverOrphanedSourcePages(metrics: JobRecoveryMetrics): Promise<void> {
    try {
      // Find source pages that are "pending" but don't have corresponding background jobs
      const orphanedThreshold = new Date(Date.now() - this.ORPHANED_TIMEOUT_MS).toISOString();
      
      const { data: pendingPages, error: pagesError } = await supabase
        .from('source_pages')
        .select('id, url, parent_source_id, created_at')
        .eq('status', 'pending')
        .lt('created_at', orphanedThreshold);

      if (pagesError || !pendingPages) {
        console.error('❌ Error finding orphaned pages:', pagesError);
        return;
      }

      if (pendingPages.length > 0) {
        console.log(`🔍 Found ${pendingPages.length} potentially orphaned pages`);

        // Check which pages don't have background jobs
        const pageIds = pendingPages.map((p: Pick<SourcePage, 'id' | 'url' | 'parent_source_id' | 'created_at'>) => p.id);
        
        const { data: existingJobs, error: jobsError } = await supabase
          .from('background_jobs')
          .select('page_id')
          .in('page_id', pageIds)
          .eq('job_type', 'process_page');

        if (jobsError) {
          console.error('❌ Error checking existing jobs:', jobsError);
          return;
        }

        const existingPageIds = new Set(existingJobs?.map((j: ExistingJobFields) => j.page_id) || []);
        const orphanedPages = pendingPages.filter((page: Pick<SourcePage, 'id' | 'url' | 'parent_source_id' | 'created_at'>) => !existingPageIds.has(page.id));

        if (orphanedPages.length > 0) {
          console.log(`🔄 Creating background jobs for ${orphanedPages.length} orphaned pages`);

          // Create background jobs for orphaned pages
          const newJobs = orphanedPages.map((page: Pick<SourcePage, 'id' | 'url' | 'parent_source_id' | 'created_at'>) => ({
            job_type: 'process_page',
            source_id: page.parent_source_id,
            page_id: page.id,
            payload: { 
              pageId: page.id, 
              url: page.url,
              parentSourceId: page.parent_source_id 
            },
            status: 'pending' as const,
            priority: 50,
            max_attempts: 3,
            scheduled_at: new Date().toISOString()
          }));

          const { error: insertError } = await supabase
            .from('background_jobs')
            .insert(newJobs);

          if (insertError) {
            console.error('❌ Error creating recovery jobs:', insertError);
          } else {
            metrics.orphanedJobs = orphanedPages.length;
            console.log(`✅ Created ${orphanedPages.length} recovery jobs for orphaned pages`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error recovering orphaned pages:', error);
    }
  }

  /**
   * Get recovery statistics with proper error handling
   */
  static async getRecoveryStats(): Promise<{
    stalledJobs: number;
    oldestStalledJob: string | null;
    recoverySuccess: boolean;
  }> {
    try {
      const stalledThreshold = new Date(Date.now() - this.STALLED_TIMEOUT_MS).toISOString();
      
      // Use safe count query
      const { count: stalledCount } = await supabase
        .from('background_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processing')
        .lt('started_at', stalledThreshold);

      // Use fetchMaybeSingle for potentially empty results
      const oldestStalled = await fetchMaybeSingle<Pick<BackgroundJob, 'started_at'>>(
        supabase
          .from('background_jobs')
          .select('started_at')
          .eq('status', 'processing')
          .lt('started_at', stalledThreshold)
          .order('started_at', { ascending: true })
          .limit(1),
        'getRecoveryStats'
      );

      return {
        stalledJobs: stalledCount || 0,
        oldestStalledJob: oldestStalled?.started_at || null,
        recoverySuccess: true
      };

    } catch (error) {
      console.error('❌ Error getting recovery stats:', error);
      return {
        stalledJobs: 0,
        oldestStalledJob: null,
        recoverySuccess: false
      };
    }
  }
}
