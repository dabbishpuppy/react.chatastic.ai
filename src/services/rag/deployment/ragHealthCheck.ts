
import { globalPerformanceMonitor } from '../performance/performanceMonitor';
import { globalCache } from '../performance/cacheService';
import { globalOptimizationService } from '../performance/optimizationService';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  metrics?: Record<string, any>;
  timestamp: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  services: HealthCheckResult[];
  uptime: number;
  recommendations: string[];
}

export class RAGHealthCheck {
  private startTime = Date.now();

  async performHealthCheck(): Promise<SystemHealth> {
    console.log('🏥 Performing RAG System Health Check...');

    const services: HealthCheckResult[] = [];

    // Check performance monitoring
    services.push(await this.checkPerformanceMonitoring());

    // Check cache service
    services.push(await this.checkCacheService());

    // Check optimization service
    services.push(await this.checkOptimizationService());

    // Check memory usage
    services.push(await this.checkMemoryUsage());

    // Check response times
    services.push(await this.checkResponseTimes());

    // Determine overall health
    const criticalIssues = services.filter(s => s.status === 'critical').length;
    const warningIssues = services.filter(s => s.status === 'warning').length;

    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalIssues > 0) {
      overall = 'critical';
    } else if (warningIssues > 0) {
      overall = 'warning';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(services);

    const uptime = Date.now() - this.startTime;

    console.log(`🏥 Health Check Complete - Overall: ${overall}`);

    return {
      overall,
      services,
      uptime,
      recommendations
    };
  }

  private async checkPerformanceMonitoring(): Promise<HealthCheckResult> {
    try {
      const snapshot = globalPerformanceMonitor.getSnapshot();
      const recentAlerts = globalPerformanceMonitor.getAlerts(10);
      const criticalAlerts = recentAlerts.filter(a => a.type === 'critical');

      if (criticalAlerts.length > 0) {
        return {
          service: 'Performance Monitoring',
          status: 'critical',
          message: `${criticalAlerts.length} critical performance alerts detected`,
          metrics: { criticalAlerts: criticalAlerts.length },
          timestamp: Date.now()
        };
      }

      const warningAlerts = recentAlerts.filter(a => a.type === 'warning');
      if (warningAlerts.length > 5) {
        return {
          service: 'Performance Monitoring',
          status: 'warning',
          message: `High number of warning alerts: ${warningAlerts.length}`,
          metrics: { warningAlerts: warningAlerts.length },
          timestamp: Date.now()
        };
      }

      return {
        service: 'Performance Monitoring',
        status: 'healthy',
        message: 'Performance monitoring functioning normally',
        metrics: { totalMetrics: snapshot.metrics.length },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        service: 'Performance Monitoring',
        status: 'critical',
        message: `Performance monitoring error: ${error}`,
        timestamp: Date.now()
      };
    }
  }

  private async checkCacheService(): Promise<HealthCheckResult> {
    try {
      const stats = globalCache.getStats();

      if (stats.hitRate < 0.3) {
        return {
          service: 'Cache Service',
          status: 'warning',
          message: `Low cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`,
          metrics: stats,
          timestamp: Date.now()
        };
      }

      if (stats.memoryUsage > 1024 * 1024 * 100) { // 100MB
        return {
          service: 'Cache Service',
          status: 'warning',
          message: 'High cache memory usage',
          metrics: stats,
          timestamp: Date.now()
        };
      }

      return {
        service: 'Cache Service',
        status: 'healthy',
        message: `Cache operating normally (${(stats.hitRate * 100).toFixed(1)}% hit rate)`,
        metrics: stats,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        service: 'Cache Service',
        status: 'critical',
        message: `Cache service error: ${error}`,
        timestamp: Date.now()
      };
    }
  }

  private async checkOptimizationService(): Promise<HealthCheckResult> {
    try {
      const recommendations = globalOptimizationService.getRecommendations();
      const highPriorityRecs = recommendations.filter(r => r.priority === 'high');

      if (highPriorityRecs.length > 3) {
        return {
          service: 'Optimization Service',
          status: 'warning',
          message: `${highPriorityRecs.length} high-priority optimization recommendations`,
          metrics: { recommendations: recommendations.length },
          timestamp: Date.now()
        };
      }

      return {
        service: 'Optimization Service',
        status: 'healthy',
        message: 'Optimization service functioning normally',
        metrics: { recommendations: recommendations.length },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        service: 'Optimization Service',
        status: 'critical',
        message: `Optimization service error: ${error}`,
        timestamp: Date.now()
      };
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    try {
      const snapshot = globalPerformanceMonitor.getSnapshot();
      const memoryUsage = snapshot.memoryUsage;

      if (memoryUsage.percentage > 90) {
        return {
          service: 'Memory Usage',
          status: 'critical',
          message: `Critical memory usage: ${memoryUsage.percentage.toFixed(1)}%`,
          metrics: memoryUsage,
          timestamp: Date.now()
        };
      }

      if (memoryUsage.percentage > 75) {
        return {
          service: 'Memory Usage',
          status: 'warning',
          message: `High memory usage: ${memoryUsage.percentage.toFixed(1)}%`,
          metrics: memoryUsage,
          timestamp: Date.now()
        };
      }

      return {
        service: 'Memory Usage',
        status: 'healthy',
        message: `Memory usage normal: ${memoryUsage.percentage.toFixed(1)}%`,
        metrics: memoryUsage,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        service: 'Memory Usage',
        status: 'warning',
        message: 'Unable to check memory usage',
        timestamp: Date.now()
      };
    }
  }

  private async checkResponseTimes(): Promise<HealthCheckResult> {
    try {
      const avgQueryTime = globalPerformanceMonitor.getAverageMetric('rag_query_processing', 300000); // 5 minutes

      if (avgQueryTime > 8000) {
        return {
          service: 'Response Times',
          status: 'critical',
          message: `Critical response times: ${avgQueryTime.toFixed(0)}ms average`,
          metrics: { avgQueryTime },
          timestamp: Date.now()
        };
      }

      if (avgQueryTime > 3000) {
        return {
          service: 'Response Times',
          status: 'warning',
          message: `Slow response times: ${avgQueryTime.toFixed(0)}ms average`,
          metrics: { avgQueryTime },
          timestamp: Date.now()
        };
      }

      return {
        service: 'Response Times',
        status: 'healthy',
        message: `Response times good: ${avgQueryTime.toFixed(0)}ms average`,
        metrics: { avgQueryTime },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        service: 'Response Times',
        status: 'warning',
        message: 'Unable to check response times',
        timestamp: Date.now()
      };
    }
  }

  private generateRecommendations(services: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];

    services.forEach(service => {
      if (service.status === 'critical') {
        recommendations.push(`🚨 CRITICAL: Address ${service.service} issues immediately`);
      } else if (service.status === 'warning') {
        recommendations.push(`⚠️ WARNING: Monitor ${service.service} closely`);
      }
    });

    // Add general recommendations
    const cacheService = services.find(s => s.service === 'Cache Service');
    if (cacheService?.metrics?.hitRate < 0.5) {
      recommendations.push('Consider increasing cache TTL or optimizing cache keys');
    }

    const memoryService = services.find(s => s.service === 'Memory Usage');
    if (memoryService?.metrics?.percentage > 70) {
      recommendations.push('Consider running memory optimization or increasing available memory');
    }

    return recommendations;
  }

  // Quick health check for monitoring endpoints
  async quickHealthCheck(): Promise<{ status: 'ok' | 'error'; timestamp: number }> {
    try {
      // Basic checks
      globalPerformanceMonitor.getSnapshot();
      globalCache.getStats();
      
      return {
        status: 'ok',
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: Date.now()
      };
    }
  }
}

// Singleton instance
export const ragHealthCheck = new RAGHealthCheck();
