
import { supabase } from "@/integrations/supabase/client";
import { CircuitBreaker } from './circuitBreaker';

export interface CrawlHealth {
  healthy: boolean;
  pendingJobs: number;
  stalledJobs: number;
  errorRate: number;
  lastHealthCheck: string;
}

export class ResilientCrawlService {
  private static healthCheckInterval: number | null = null;
  private static lastHealthCheck: CrawlHealth | null = null;

  // Start health monitoring
  static startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      console.log('Health monitoring already running');
      return;
    }

    console.log('🏥 Starting crawl health monitoring...');
    
    // Initial health check
    this.performHealthCheck();
    
    // Set up periodic health checks every 2 minutes
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, 2 * 60 * 1000);
  }

  static stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Stopped crawl health monitoring');
    }
  }

  // Perform health check and auto-recovery
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
            pendingJobs: data.stalledJobs?.length || 0,
            stalledJobs: data.timeoutJobs?.length || 0,
            errorRate: 0, // Will be calculated by the monitor
            lastHealthCheck: new Date().toISOString()
          };

          if (!data.healthy) {
            console.log('🚨 Health issues detected:', data.issues);
            console.log('🔧 Auto-recovery actions taken:', data.actions);
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
            errorRate: 0,
            lastHealthCheck: new Date().toISOString()
          };

          return { healthy: this.lastHealthCheck.healthy };
        }
      );
    } catch (error) {
      console.error('❌ Health monitoring failed:', error);
    }
  }

  // Enhanced crawl initiation with resilience
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

        return {
          success: true,
          parentSourceId: data.parentSourceId
        };
      },
      async () => {
        // Fallback: simpler crawl approach
        console.log('⚡ Using fallback crawl method for:', url);
        
        // Create a basic source entry and queue it for later processing
        const { data: source, error } = await supabase
          .from('agent_sources')
          .insert({
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

        return {
          success: true,
          parentSourceId: source.id
        };
      }
    );
  }

  // Get current health status
  static getCurrentHealth(): CrawlHealth | null {
    return this.lastHealthCheck;
  }

  // Manual recovery trigger
  static async triggerManualRecovery(): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('crawl-health-monitor');
      
      if (error) {
        throw new Error(`Manual recovery failed: ${error.message}`);
      }

      return {
        success: true,
        message: `Recovery completed. Actions taken: ${data.actions?.join(', ') || 'None needed'}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get circuit breaker status
  static getSystemStatus(): {
    crawlService: any;
    healthMonitor: any;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  } {
    const crawlService = CircuitBreaker.getServiceHealth('enhanced-crawl');
    const healthMonitor = CircuitBreaker.getServiceHealth('crawl-health-monitor');
    
    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (!crawlService.available || !healthMonitor.available) {
      overallHealth = 'critical';
    } else if (crawlService.failureCount > 0 || healthMonitor.failureCount > 0) {
      overallHealth = 'degraded';
    }

    return {
      crawlService,
      healthMonitor,
      overallHealth
    };
  }
}
