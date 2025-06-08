
import { HealthMonitor } from './healthMonitor';
import { CrawlInitiator } from './crawlInitiator';
import { RecoveryManager } from './recoveryManager';
import { SystemStatusProvider } from './systemStatusProvider';
import type { CrawlHealth, CrawlOptions, CrawlResult, RecoveryResult, SystemStatus } from './types/crawlHealthTypes';

export class ResilientCrawlService {
  private static healthCheckInterval: number | null = null;
  private static autoRecoveryEnabled = true;

  // Start enhanced health monitoring with auto-recovery
  static startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      console.log('Health monitoring already running');
      return;
    }

    console.log('🏥 Starting enhanced crawl health monitoring with auto-recovery...');
    
    // Initial health check
    HealthMonitor.performHealthCheck();
    
    // Set up periodic health checks every 30 seconds
    this.healthCheckInterval = window.setInterval(() => {
      HealthMonitor.performHealthCheck();
    }, 30 * 1000);
  }

  static stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Stopped crawl health monitoring');
    }
  }

  // Enhanced crawl initiation with improved resilience
  static async initiateCrawlWithResilience(
    url: string,
    options: CrawlOptions
  ): Promise<CrawlResult> {
    return await CrawlInitiator.initiateCrawlWithResilience(url, options);
  }

  // Get current health status
  static getCurrentHealth(): CrawlHealth | null {
    return HealthMonitor.getCurrentHealth();
  }

  // Manual recovery trigger with enhanced capabilities
  static async triggerManualRecovery(): Promise<RecoveryResult> {
    return await RecoveryManager.triggerManualRecovery();
  }

  // Get comprehensive system status
  static getSystemStatus(): SystemStatus {
    return SystemStatusProvider.getSystemStatus();
  }

  // Enable/disable auto-recovery
  static setAutoRecovery(enabled: boolean): void {
    this.autoRecoveryEnabled = enabled;
    console.log(`🔧 Auto-recovery ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export the interfaces for backward compatibility
export type { CrawlHealth, CrawlOptions, CrawlResult, RecoveryResult, SystemStatus };
