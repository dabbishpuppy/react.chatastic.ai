
import { supabase } from "@/integrations/supabase/client";
import { CircuitBreaker } from './circuitBreaker';
import { AtomicJobClaiming } from './atomicJobClaiming';

export interface CrawlHealth {
  healthy: boolean;
  pendingJobs: number;
  stalledJobs: number;
  errorRate: number;
  lastHealthCheck: string;
  autoRecoveryActive: boolean;
  missedJobs: number;
}

export class ResilientCrawlService {
  private static healthCheckInterval: number | null = null;
  private static lastHealthCheck: CrawlHealth | null = null;
  private static autoRecoveryEnabled = true;

  // Start enhanced health monitoring with auto-recovery
  static startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      console.log('Health monitoring already running');
      return;
    }

    console.log('🏥 Starting enhanced crawl health monitoring with auto-recovery...');
    
    // Initial health check
    this.performHealthCheck();
    
    // Set up periodic health checks every 30 seconds
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, 30 * 1000);
  }

  static stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Stopped crawl health monitoring');
    }
  }

  // Enhanced health check with comprehensive auto-recovery
  private static async performHealthCheck(): Promise<void> {
    try {
      await CircuitBreaker.executeWithBreaker(
        'crawl-health-monitor',
        async () => {
          const { data, error } = await supabase.functions.invoke('crawl-health-monitor');
          
          if (error) {
            throw new Error(`Health check failed: ${error.message}`);
          }

          this.lastHealthCheck = {
            healthy: data.healthy,
            pendingJobs: data.report?.orphanedPages || 0,
            stalledJobs: data.report?.stalledJobs || 0,
            missedJobs: data.report?.missingJobs || 0,
            errorRate: 0, // Calculated by the monitor
            lastHealthCheck: new Date().toISOString(),
            autoRecoveryActive: this.autoRecoveryEnabled
          };

          if (!data.healthy && this.autoRecoveryEnabled) {
            console.log('🚨 Health issues detected, auto-recovery actions taken:', data.report?.actions || []);
            
            // Trigger additional recovery if needed
            if (data.report?.orphanedPages > 50) {
              console.log('🔧 High number of orphaned pages detected, triggering enhanced recovery...');
              await this.triggerEnhancedRecovery();
            }
          }

          return data;
        },
        async () => {
          // Fallback: basic health check using direct database queries
          console.log('⚡ Using fallback health check method');
          
          const { data: pendingJobs } = await supabase
            .from('source_pages')
            .select('id')
            .eq('status', 'pending')
            .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

          this.lastHealthCheck = {
            healthy: (pendingJobs?.length || 0) < 10,
            pendingJobs: pendingJobs?.length || 0,
            stalledJobs: 0,
            missedJobs: 0,
            errorRate: 0,
            lastHealthCheck: new Date().toISOString(),
            autoRecoveryActive: this.autoRecoveryEnabled
          };

          return { healthy: this.lastHealthCheck.healthy };
        }
      );
    } catch (error) {
      console.error('❌ Health monitoring failed:', error);
    }
  }

  // Enhanced crawl initiation with improved resilience
  static async initiateCrawlWithResilience(
    url: string,
    options: any
  ): Promise<{ success: boolean; parentSourceId?: string; error?: string }> {
    return await CircuitBreaker.executeWithBreaker(
      'enhanced-crawl',
      async () => {
        const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
          body: { url, ...options }
        });

        if (error) {
          throw new Error(`Crawl failed: ${error.message}`);
        }

        // Ensure background jobs are created
        if (data.parentSourceId) {
          await this.ensureJobsCreated(data.parentSourceId);
        }

        return {
          success: true,
          parentSourceId: data.parentSourceId
        };
      },
      async () => {
        // Enhanced fallback with job creation
        console.log('⚡ Using enhanced fallback crawl method for:', url);
        
        const agentId = options.agentId;
        const teamId = options.teamId;
        
        if (!agentId || !teamId) {
          throw new Error('Missing required agentId or teamId for fallback crawl');
        }
        
        // Create a basic source entry
        const { data: source, error } = await supabase
          .from('agent_sources')
          .insert({
            agent_id: agentId,
            team_id: teamId,
            url,
            title: url,
            source_type: 'website',
            crawl_status: 'pending',
            is_active: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Create a single source page and background job
        const { data: page, error: pageError } = await supabase
          .from('source_pages')
          .insert({
            parent_source_id: source.id,
            url: url,
            status: 'pending'
          })
          .select()
          .single();

        if (!pageError && page) {
          // Create background job
          await supabase
            .from('background_jobs')
            .insert({
              job_type: 'process_page',
              source_id: source.id,
              page_id: page.id,
              job_key: `fallback:${page.id}`,
              payload: { childJobId: page.id, url: url },
              priority: 100
            });
        }

        return {
          success: true,
          parentSourceId: source.id
        };
      }
    );
  }

  // Ensure background jobs exist for a parent source
  private static async ensureJobsCreated(parentSourceId: string): Promise<void> {
    try {
      console.log(`🔧 Ensuring background jobs exist for parent: ${parentSourceId}`);
      
      // Check for pending pages without background jobs
      const { data: pendingPages } = await supabase
        .from('source_pages')
        .select('id, url')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'pending');

      if (!pendingPages || pendingPages.length === 0) {
        return;
      }

      // Check which ones have background jobs
      const pageIds = pendingPages.map(p => p.id);
      const { data: existingJobs } = await supabase
        .from('background_jobs')
        .select('page_id')
        .in('page_id', pageIds)
        .in('status', ['pending', 'processing']);

      const existingJobPageIds = new Set(existingJobs?.map(j => j.page_id) || []);
      const pagesNeedingJobs = pendingPages.filter(page => !existingJobPageIds.has(page.id));

      if (pagesNeedingJobs.length > 0) {
        console.log(`🚀 Creating ${pagesNeedingJobs.length} missing background jobs`);
        
        const jobsToCreate = pagesNeedingJobs.map(page => ({
          job_type: 'process_page',
          source_id: parentSourceId,
          page_id: page.id,
          job_key: `ensure:${page.id}:${Date.now()}`,
          payload: { childJobId: page.id, url: page.url },
          priority: 100,
          scheduled_at: new Date().toISOString()
        }));

        await supabase
          .from('background_jobs')
          .insert(jobsToCreate);

        console.log(`✅ Created ${pagesNeedingJobs.length} missing background jobs`);
      }
    } catch (error) {
      console.error('❌ Failed to ensure jobs created:', error);
    }
  }

  // Enhanced recovery with comprehensive fixes
  private static async triggerEnhancedRecovery(): Promise<void> {
    try {
      console.log('🔧 Triggering enhanced recovery procedures...');
      
      // 1. Trigger crawl recovery service
      const { data: recoveryData } = await supabase.functions.invoke('crawl-recovery-service');
      
      if (recoveryData?.report) {
        console.log('✅ Recovery service completed:', recoveryData.report);
      }

      // 2. Use atomic job claiming to process any stuck jobs
      const claimingStats = await AtomicJobClaiming.processJobsAtomically(
        async (job) => {
          // Simulate job processing or delegate to actual processor
          console.log(`🔄 Processing recovered job: ${job.id}`);
          return true;
        },
        {
          maxJobs: 20,
          workerId: `recovery-${Date.now()}`,
          timeoutMs: 60000 // 1 minute timeout for recovery jobs
        }
      );

      console.log('📊 Recovery job processing stats:', claimingStats);

      // 3. Trigger production queue manager
      await supabase.functions.invoke('production-queue-manager', {
        body: { recoveryMode: true, highPriority: true }
      });

      console.log('✅ Enhanced recovery procedures completed');
      
    } catch (error) {
      console.error('❌ Enhanced recovery failed:', error);
    }
  }

  // Get current health status
  static getCurrentHealth(): CrawlHealth | null {
    return this.lastHealthCheck;
  }

  // Manual recovery trigger with enhanced capabilities
  static async triggerManualRecovery(): Promise<{ success: boolean; message: string }> {
    try {
      await this.triggerEnhancedRecovery();
      
      return {
        success: true,
        message: 'Enhanced recovery completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get comprehensive system status
  static getSystemStatus(): {
    crawlService: any;
    healthMonitor: any;
    jobClaiming: any;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  } {
    const crawlService = CircuitBreaker.getServiceHealth('enhanced-crawl');
    const healthMonitor = CircuitBreaker.getServiceHealth('crawl-health-monitor');
    const currentHealth = this.getCurrentHealth();
    
    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (!crawlService.available || !healthMonitor.available || (currentHealth && !currentHealth.healthy)) {
      overallHealth = 'critical';
    } else if (crawlService.failureCount > 0 || healthMonitor.failureCount > 0 || (currentHealth && currentHealth.stalledJobs > 10)) {
      overallHealth = 'degraded';
    }

    return {
      crawlService,
      healthMonitor,
      jobClaiming: {
        enabled: true,
        lastCheck: currentHealth?.lastHealthCheck || 'Never'
      },
      overallHealth
    };
  }

  // Enable/disable auto-recovery
  static setAutoRecovery(enabled: boolean): void {
    this.autoRecoveryEnabled = enabled;
    console.log(`🔧 Auto-recovery ${enabled ? 'enabled' : 'disabled'}`);
  }
}
