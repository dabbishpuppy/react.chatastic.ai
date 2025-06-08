
import { supabase } from "@/integrations/supabase/client";
import { CircuitBreaker } from './circuitBreaker';
import type { CrawlHealth } from './types/crawlHealthTypes';

export class HealthMonitor {
  private static lastHealthCheck: CrawlHealth | null = null;

  static async performHealthCheck(): Promise<void> {
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
            errorRate: 0,
            lastHealthCheck: new Date().toISOString(),
            autoRecoveryActive: true
          };

          return data;
        },
        async () => {
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
            autoRecoveryActive: true
          };

          return { healthy: this.lastHealthCheck.healthy };
        }
      );
    } catch (error) {
      console.error('❌ Health monitoring failed:', error);
    }
  }

  static getCurrentHealth(): CrawlHealth | null {
    return this.lastHealthCheck;
  }
}
