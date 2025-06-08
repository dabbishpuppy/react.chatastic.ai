
import { CircuitBreaker } from './circuitBreaker';
import { HealthMonitor } from './healthMonitor';
import type { SystemStatus } from './types/crawlHealthTypes';

export class SystemStatusProvider {
  static getSystemStatus(): SystemStatus {
    const crawlService = CircuitBreaker.getServiceHealth('enhanced-crawl');
    const healthMonitor = CircuitBreaker.getServiceHealth('crawl-health-monitor');
    const currentHealth = HealthMonitor.getCurrentHealth();
    
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
}
