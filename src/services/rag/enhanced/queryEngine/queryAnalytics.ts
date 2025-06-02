export interface QueryAnalytics {
  queryId: string;
  timestamp: Date;
  processingTime: number;
  optimizationLevel: string;
  cacheHit: boolean;
  resultQuality: number;
  userSatisfaction?: number;
  errorCount: number;
}

export class QueryAnalytics {
  private static analytics: QueryAnalytics[] = [];
  private static readonly MAX_ANALYTICS_ENTRIES = 1000;

  static recordQuery(analytics: Omit<QueryAnalytics, 'queryId' | 'timestamp'>): void {
    const record: QueryAnalytics = {
      queryId: this.generateQueryId(),
      timestamp: new Date(),
      ...analytics
    };

    this.analytics.push(record);

    // Keep only recent entries
    if (this.analytics.length > this.MAX_ANALYTICS_ENTRIES) {
      this.analytics = this.analytics.slice(-this.MAX_ANALYTICS_ENTRIES);
    }

    console.log('📊 Query analytics recorded:', {
      queryId: record.queryId,
      processingTime: record.processingTime,
      optimization: record.optimizationLevel,
      quality: record.resultQuality
    });
  }

  static recordQueryExecution(queryId: string, metrics: {
    processingTime: number;
    optimizationLevel: string;
    cacheHit: boolean;
    resultQuality: number;
    errorCount: number;
  }): void {
    const record: QueryAnalytics = {
      queryId,
      timestamp: new Date(),
      ...metrics,
    };

    this.analytics.push(record);

    // Keep only recent entries
    if (this.analytics.length > this.MAX_ANALYTICS_ENTRIES) {
      this.analytics = this.analytics.slice(-this.MAX_ANALYTICS_ENTRIES);
    }

    console.log('📊 Query execution recorded:', {
      queryId: record.queryId,
      processingTime: record.processingTime,
      optimization: record.optimizationLevel,
      quality: record.resultQuality
    });
  }

  static getAnalyticsSummary(timeframeHours: number = 24): {
    totalQueries: number;
    averageProcessingTime: number;
    cacheHitRate: number;
    averageQuality: number;
    errorRate: number;
    optimizationDistribution: Record<string, number>;
  } {
    const cutoffTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
    const recentAnalytics = this.analytics.filter(a => a.timestamp > cutoffTime);

    if (recentAnalytics.length === 0) {
      return {
        totalQueries: 0,
        averageProcessingTime: 0,
        cacheHitRate: 0,
        averageQuality: 0,
        errorRate: 0,
        optimizationDistribution: {}
      };
    }

    const totalQueries = recentAnalytics.length;
    const averageProcessingTime = recentAnalytics.reduce((sum, a) => sum + a.processingTime, 0) / totalQueries;
    const cacheHitRate = recentAnalytics.filter(a => a.cacheHit).length / totalQueries;
    const averageQuality = recentAnalytics.reduce((sum, a) => sum + a.resultQuality, 0) / totalQueries;
    const errorRate = recentAnalytics.filter(a => a.errorCount > 0).length / totalQueries;

    const optimizationDistribution = recentAnalytics.reduce((dist, a) => {
      dist[a.optimizationLevel] = (dist[a.optimizationLevel] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      totalQueries,
      averageProcessingTime,
      cacheHitRate,
      averageQuality,
      errorRate,
      optimizationDistribution
    };
  }

  static getPerformanceTrends(timeframeHours: number = 168): Array<{
    hour: string;
    averageProcessingTime: number;
    queryCount: number;
    cacheHitRate: number;
  }> {
    const cutoffTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
    const recentAnalytics = this.analytics.filter(a => a.timestamp > cutoffTime);

    // Group by hour
    const hourlyData = new Map<string, QueryAnalytics[]>();
    
    recentAnalytics.forEach(analytics => {
      const hour = analytics.timestamp.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, []);
      }
      hourlyData.get(hour)!.push(analytics);
    });

    return Array.from(hourlyData.entries()).map(([hour, data]) => ({
      hour,
      averageProcessingTime: data.reduce((sum, a) => sum + a.processingTime, 0) / data.length,
      queryCount: data.length,
      cacheHitRate: data.filter(a => a.cacheHit).length / data.length
    })).sort((a, b) => a.hour.localeCompare(b.hour));
  }

  static identifySlowQueries(thresholdMs: number = 3000): QueryAnalytics[] {
    return this.analytics
      .filter(a => a.processingTime > thresholdMs)
      .sort((a, b) => b.processingTime - a.processingTime)
      .slice(0, 10); // Top 10 slowest
  }

  static generatePerformanceReport(): {
    summary: any;
    trends: any[];
    slowQueries: QueryAnalytics[];
    recommendations: string[];
  } {
    const summary = this.getAnalyticsSummary();
    const trends = this.getPerformanceTrends();
    const slowQueries = this.identifySlowQueries();

    const recommendations: string[] = [];

    if (summary.averageProcessingTime > 2000) {
      recommendations.push('Consider enabling more aggressive optimization levels');
    }

    if (summary.cacheHitRate < 0.3) {
      recommendations.push('Implement better query caching strategies');
    }

    if (summary.errorRate > 0.05) {
      recommendations.push('Investigate and address query processing errors');
    }

    if (summary.averageQuality < 3.0) {
      recommendations.push('Review and tune ranking parameters for better result quality');
    }

    return {
      summary,
      trends,
      slowQueries,
      recommendations
    };
  }

  private static generateQueryId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  static clearAnalytics(): void {
    this.analytics = [];
  }

  static exportAnalytics(): QueryAnalytics[] {
    return [...this.analytics];
  }
}
