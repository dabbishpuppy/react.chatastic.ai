
import { supabase } from "@/integrations/supabase/client";
import { JobRecoveryService } from './jobRecoveryService';
import { CrawlSystemManager } from './crawlSystemManager';

export class JobAutomationService {
  private static isRunning = false;
  private static automationInterval: number | null = null;

  /**
   * Start automated job recovery and health monitoring
   */
  static startAutomation(): void {
    if (this.isRunning) {
      console.log('🤖 Job automation already running');
      return;
    }

    console.log('🤖 Starting automated job recovery and monitoring...');
    this.isRunning = true;

    // Run automation every 2 minutes
    this.automationInterval = window.setInterval(async () => {
      try {
        await this.runAutomationCycle();
      } catch (error) {
        console.error('❌ Automation cycle failed:', error);
      }
    }, 2 * 60 * 1000);

    // Run initial cycle
    setTimeout(() => this.runAutomationCycle(), 5000);
  }

  /**
   * Stop automated job recovery
   */
  static stopAutomation(): void {
    if (this.automationInterval) {
      clearInterval(this.automationInterval);
      this.automationInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Job automation stopped');
  }

  /**
   * Run a complete automation cycle
   */
  private static async runAutomationCycle(): Promise<void> {
    console.log('🔄 Running automation cycle...');

    try {
      // 1. Recover stalled jobs
      const recoveryMetrics = await JobRecoveryService.recoverStalledJobs();
      
      if (recoveryMetrics.recoveredJobs > 0) {
        console.log(`🔧 Automation recovered ${recoveryMetrics.recoveredJobs} stalled jobs`);
      }

      // 2. Check system health
      const systemStatus = await CrawlSystemManager.getSystemStatus();
      
      if (!systemStatus.isHealthy) {
        console.log('⚠️ System unhealthy, triggering additional recovery...');
        await CrawlSystemManager.triggerRecovery();
      }

      // 3. Process stuck sources
      await this.processStuckSources();

      // 4. Cleanup completed sources
      await this.cleanupCompletedSources();

    } catch (error) {
      console.error('❌ Automation cycle error:', error);
    }
  }

  /**
   * Process sources that are stuck in processing states
   */
  private static async processStuckSources(): Promise<void> {
    try {
      // Find sources stuck in 'in_progress' for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data: stuckSources, error } = await supabase
        .from('agent_sources')
        .select('id, url, crawl_status, updated_at')
        .eq('source_type', 'website')
        .eq('crawl_status', 'in_progress')
        .lt('updated_at', tenMinutesAgo);

      if (error) {
        console.error('❌ Error finding stuck sources:', error);
        return;
      }

      if (stuckSources && stuckSources.length > 0) {
        console.log(`🔧 Found ${stuckSources.length} stuck sources, processing...`);

        for (const source of stuckSources) {
          try {
            // Trigger processing for stuck source
            await supabase.functions.invoke('process-source-pages', {
              body: { 
                parentSourceId: source.id,
                maxConcurrentJobs: 3 // Use lower concurrency for recovery
              }
            });

            console.log(`🔄 Triggered processing for stuck source: ${source.id}`);
          } catch (error) {
            console.error(`❌ Failed to process stuck source ${source.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing stuck sources:', error);
    }
  }

  /**
   * Cleanup and aggregate completed sources
   */
  private static async cleanupCompletedSources(): Promise<void> {
    try {
      // Find sources that might need status aggregation
      const { data: sourcesToCheck, error } = await supabase
        .from('agent_sources')
        .select('id, crawl_status')
        .eq('source_type', 'website')
        .in('crawl_status', ['in_progress', 'pending'])
        .limit(10);

      if (error || !sourcesToCheck) return;

      for (const source of sourcesToCheck) {
        try {
          // Check if all child pages are completed
          const { data: childStats } = await supabase
            .from('source_pages')
            .select('status')
            .eq('parent_source_id', source.id);

          if (childStats && childStats.length > 0) {
            const allCompleted = childStats.every(page => 
              page.status === 'completed' || page.status === 'failed'
            );

            if (allCompleted && source.crawl_status !== 'completed') {
              // Trigger status aggregation
              await supabase.rpc('aggregate_parent_status', {
                parent_id: source.id
              });

              console.log(`✅ Aggregated status for completed source: ${source.id}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error checking source ${source.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error in cleanup process:', error);
    }
  }

  /**
   * Get automation status
   */
  static getStatus(): { isRunning: boolean; lastRun: string | null } {
    return {
      isRunning: this.isRunning,
      lastRun: this.isRunning ? new Date().toISOString() : null
    };
  }

  /**
   * Force run automation cycle manually
   */
  static async forceRun(): Promise<void> {
    console.log('🔧 Force running automation cycle...');
    await this.runAutomationCycle();
  }
}
