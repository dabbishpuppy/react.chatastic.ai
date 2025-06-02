export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  context?: Record<string, any>;
}

export interface PerformanceSnapshot {
  timestamp: number;
  metrics: PerformanceMetric[];
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cacheStats: {
    hitRate: number;
    size: number;
    memoryUsage: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  actualValue: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: Map<string, { warning: number; error: number; critical: number }> = new Map();
  private maxMetricsHistory = 1000;
  private maxAlertsHistory = 100;

  constructor() {
    this.setupDefaultThresholds();
  }

  // Record a performance metric
  recordMetric(name: string, value: number, unit: PerformanceMetric['unit'], context?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      context
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Check for threshold violations
    this.checkThresholds(metric);

    console.log('📊 Performance metric recorded:', {
      name,
      value,
      unit,
      context: context ? Object.keys(context) : undefined
    });
  }

  // Time a function execution
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, 'ms', {
        ...context,
        status: 'success'
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, 'ms', {
        ...context,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  // Get performance snapshot
  getSnapshot(): PerformanceSnapshot {
    const memoryInfo = this.getMemoryInfo();
    const cacheStats = this.getCacheStats();

    return {
      timestamp: Date.now(),
      metrics: [...this.metrics],
      memoryUsage: memoryInfo,
      cacheStats
    };
  }

  // Get metrics by name
  getMetricsByName(name: string, limit?: number): PerformanceMetric[] {
    const filtered = this.metrics.filter(m => m.name === name);
    return limit ? filtered.slice(-limit) : filtered;
  }

  // Get average metric value over time period
  getAverageMetric(name: string, timeWindowMs: number = 300000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter(m => m.name === name && m.timestamp >= cutoff);
    
    if (recentMetrics.length === 0) return 0;
    
    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
  }

  // Set performance thresholds
  setThreshold(
    metricName: string,
    thresholds: { warning: number; error: number; critical: number }
  ): void {
    this.thresholds.set(metricName, thresholds);
  }

  // Get recent alerts
  getAlerts(limit?: number): PerformanceAlert[] {
    return limit ? this.alerts.slice(-limit) : [...this.alerts];
  }

  // Clear old alerts
  clearOldAlerts(olderThanMs: number = 3600000): number {
    const cutoff = Date.now() - olderThanMs;
    const initialCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoff);
    return initialCount - this.alerts.length;
  }

  // Generate performance report
  generateReport(timeWindowMs: number = 3600000): {
    summary: Record<string, any>;
    topSlowOperations: Array<{ name: string; avgDuration: number; count: number }>;
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const cutoff = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    const recentAlerts = this.alerts.filter(a => a.timestamp >= cutoff);

    // Group metrics by name
    const metricGroups = new Map<string, PerformanceMetric[]>();
    recentMetrics.forEach(metric => {
      if (!metricGroups.has(metric.name)) {
        metricGroups.set(metric.name, []);
      }
      metricGroups.get(metric.name)!.push(metric);
    });

    // Calculate averages and find slow operations
    const topSlowOperations = Array.from(metricGroups.entries())
      .filter(([name, metrics]) => metrics[0]?.unit === 'ms')
      .map(([name, metrics]) => ({
        name,
        avgDuration: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length,
        count: metrics.length
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metricGroups, recentAlerts);

    return {
      summary: {
        totalMetrics: recentMetrics.length,
        uniqueOperations: metricGroups.size,
        alertsGenerated: recentAlerts.length,
        timeWindow: timeWindowMs
      },
      topSlowOperations,
      alerts: recentAlerts,
      recommendations
    };
  }

  private setupDefaultThresholds(): void {
    // RAG operation thresholds (in milliseconds)
    this.setThreshold('rag_query_processing', { warning: 2000, error: 5000, critical: 10000 });
    this.setThreshold('semantic_search', { warning: 1000, error: 3000, critical: 6000 });
    this.setThreshold('context_ranking', { warning: 500, error: 1500, critical: 3000 });
    this.setThreshold('llm_response', { warning: 3000, error: 8000, critical: 15000 });
    this.setThreshold('embedding_generation', { warning: 1000, error: 2500, critical: 5000 });
    
    // Memory thresholds (in percentage)
    this.setThreshold('memory_usage', { warning: 70, error: 85, critical: 95 });
    
    // Cache thresholds
    this.setThreshold('cache_hit_rate', { warning: 50, error: 30, critical: 10 });
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;

    let alertType: PerformanceAlert['type'] | null = null;
    
    if (metric.value >= threshold.critical) {
      alertType = 'critical';
    } else if (metric.value >= threshold.error) {
      alertType = 'error';
    } else if (metric.value >= threshold.warning) {
      alertType = 'warning';
    }

    if (alertType) {
      const alert: PerformanceAlert = {
        id: `${metric.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: alertType,
        message: `${metric.name} exceeded ${alertType} threshold`,
        metric: metric.name,
        threshold: threshold[alertType],
        actualValue: metric.value,
        timestamp: metric.timestamp
      };

      this.alerts.push(alert);
      
      // Keep only recent alerts
      if (this.alerts.length > this.maxAlertsHistory) {
        this.alerts = this.alerts.slice(-this.maxAlertsHistory);
      }

      console.warn(`⚠️ Performance alert (${alertType}):`, alert.message);
    }
  }

  private getMemoryInfo(): PerformanceSnapshot['memoryUsage'] {
    // Browser memory estimation
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    
    // Fallback for environments without memory API
    return {
      used: 0,
      total: 0,
      percentage: 0
    };
  }

  private getCacheStats(): PerformanceSnapshot['cacheStats'] {
    // This would integrate with the CacheService
    return {
      hitRate: 0,
      size: 0,
      memoryUsage: 0
    };
  }

  private generateRecommendations(
    metricGroups: Map<string, PerformanceMetric[]>,
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for slow operations
    for (const [name, metrics] of metricGroups) {
      const avgValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      
      if (name.includes('rag_query') && avgValue > 3000) {
        recommendations.push('Consider implementing query result caching to improve RAG response times');
      }
      
      if (name.includes('semantic_search') && avgValue > 2000) {
        recommendations.push('Optimize embedding search with better indexing or reduce search scope');
      }
      
      if (name.includes('llm_response') && avgValue > 5000) {
        recommendations.push('Consider using a faster LLM model or implementing response streaming');
      }
    }

    // Check alert patterns
    const criticalAlerts = alerts.filter(a => a.type === 'critical');
    if (criticalAlerts.length > 5) {
      recommendations.push('Multiple critical performance issues detected - consider scaling resources');
    }

    return recommendations;
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();
