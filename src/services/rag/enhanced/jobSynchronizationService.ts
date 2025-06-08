
import { supabase } from "@/integrations/supabase/client";

export interface SyncMetrics {
  scannedPages: number;
  missingJobs: number;
  createdJobs: number;
  errors: string[];
  syncDuration: number;
}

export class JobSynchronizationService {
  private static isRunning = false;
  private static syncInterval: NodeJS.Timeout | null = null;
  private static readonly SYNC_INTERVAL_MS = 30000; // 30 seconds
  private static readonly MAX_PAGES_PER_SYNC = 100;

  /**
   * Start the job synchronization service
   */
  static startSynchronization(): void {
    if (this.isRunning) {
      console.log('🔄 Job synchronization already running');
      return;
    }

    console.log('🚀 Starting job synchronization service...');
    this.isRunning = true;

    // Run initial sync
    this.performSync();

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop the job synchronization service
   */
  static stopSynchronization(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Stopped job synchronization service');
  }

  /**
   * Perform a single synchronization pass
   */
  static async performSync(): Promise<SyncMetrics> {
    const startTime = Date.now();
    const metrics: SyncMetrics = {
      scannedPages: 0,
      missingJobs: 0,
      createdJobs: 0,
      errors: [],
      syncDuration: 0
    };

    try {
      console.log('🔍 Starting job synchronization scan...');

      // Find pages that are pending but don't have corresponding background jobs
      const { data: orphanedPages, error: pagesError } = await supabase
        .from('source_pages')
        .select('id, url, parent_source_id, customer_id')
        .eq('status', 'pending')
        .limit(this.MAX_PAGES_PER_SYNC);

      if (pagesError) {
        metrics.errors.push(`Failed to fetch orphaned pages: ${pagesError.message}`);
        return metrics;
      }

      if (!orphanedPages || orphanedPages.length === 0) {
        console.log('✅ No orphaned pages found');
        metrics.syncDuration = Date.now() - startTime;
        return metrics;
      }

      metrics.scannedPages = orphanedPages.length;
      console.log(`📋 Found ${orphanedPages.length} pending pages to check`);

      // Check which pages don't have background jobs
      const pageIds = orphanedPages.map(p => p.id);
      const { data: existingJobs, error: jobsError } = await supabase
        .from('background_jobs')
        .select('page_id')
        .in('page_id', pageIds)
        .in('status', ['pending', 'processing']);

      if (jobsError) {
        metrics.errors.push(`Failed to check existing jobs: ${jobsError.message}`);
        return metrics;
      }

      const existingJobPageIds = new Set(existingJobs?.map(j => j.page_id) || []);
      const pagesNeedingJobs = orphanedPages.filter(page => !existingJobPageIds.has(page.id));

      if (pagesNeedingJobs.length === 0) {
        console.log('✅ All pending pages have corresponding background jobs');
        metrics.syncDuration = Date.now() - startTime;
        return metrics;
      }

      metrics.missingJobs = pagesNeedingJobs.length;
      console.log(`🔧 Creating ${pagesNeedingJobs.length} missing background jobs`);

      // Create missing background jobs
      const jobsToCreate = pagesNeedingJobs.map(page => ({
        job_type: 'process_page',
        source_id: page.parent_source_id,
        page_id: page.id,
        job_key: `sync:${page.id}:${Date.now()}`,
        payload: {
          childJobId: page.id,
          url: page.url,
          parentSourceId: page.parent_source_id,
          customerId: page.customer_id,
          syncCreated: true
        },
        priority: 75, // Medium priority for sync-created jobs
        scheduled_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('background_jobs')
        .insert(jobsToCreate);

      if (insertError) {
        metrics.errors.push(`Failed to create background jobs: ${insertError.message}`);
      } else {
        metrics.createdJobs = jobsToCreate.length;
        console.log(`✅ Successfully created ${jobsToCreate.length} background jobs`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      metrics.errors.push(`Synchronization failed: ${errorMessage}`);
      console.error('❌ Job synchronization error:', error);
    } finally {
      metrics.syncDuration = Date.now() - startTime;
      console.log(`🎯 Sync completed in ${metrics.syncDuration}ms:`, {
        scanned: metrics.scannedPages,
        missing: metrics.missingJobs,
        created: metrics.createdJobs,
        errors: metrics.errors.length
      });
    }

    return metrics;
  }

  /**
   * Force an immediate synchronization
   */
  static async forceSynchronization(): Promise<SyncMetrics> {
    console.log('🔄 Forcing immediate job synchronization...');
    return await this.performSync();
  }

  /**
   * Get synchronization status
   */
  static getStatus(): {
    isRunning: boolean;
    intervalMs: number;
    lastSync: string | null;
  } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.SYNC_INTERVAL_MS,
      lastSync: null // Could be enhanced to track last sync time
    };
  }

  /**
   * Perform emergency recovery for a specific parent source
   */
  static async emergencyRecovery(parentSourceId: string): Promise<SyncMetrics> {
    console.log(`🚨 Emergency recovery for parent source: ${parentSourceId}`);
    
    const startTime = Date.now();
    const metrics: SyncMetrics = {
      scannedPages: 0,
      missingJobs: 0,
      createdJobs: 0,
      errors: [],
      syncDuration: 0
    };

    try {
      // Find all pending pages for this parent
      const { data: pendingPages, error: pagesError } = await supabase
        .from('source_pages')
        .select('id, url, customer_id')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'pending');

      if (pagesError || !pendingPages) {
        metrics.errors.push(`Failed to fetch pending pages: ${pagesError?.message || 'No data'}`);
        return metrics;
      }

      metrics.scannedPages = pendingPages.length;

      if (pendingPages.length === 0) {
        console.log('✅ No pending pages found for emergency recovery');
        return metrics;
      }

      // Create background jobs for all pending pages
      const jobsToCreate = pendingPages.map(page => ({
        job_type: 'process_page',
        source_id: parentSourceId,
        page_id: page.id,
        job_key: `emergency:${page.id}:${Date.now()}`,
        payload: {
          childJobId: page.id,
          url: page.url,
          parentSourceId: parentSourceId,
          customerId: page.customer_id,
          emergencyRecovery: true
        },
        priority: 50, // High priority for emergency recovery
        scheduled_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('background_jobs')
        .insert(jobsToCreate);

      if (insertError) {
        metrics.errors.push(`Emergency recovery failed: ${insertError.message}`);
      } else {
        metrics.createdJobs = jobsToCreate.length;
        console.log(`🚑 Emergency recovery: created ${jobsToCreate.length} jobs`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      metrics.errors.push(`Emergency recovery error: ${errorMessage}`);
      console.error('❌ Emergency recovery failed:', error);
    } finally {
      metrics.syncDuration = Date.now() - startTime;
    }

    return metrics;
  }
}
