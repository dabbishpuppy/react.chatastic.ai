
import { supabase } from "@/integrations/supabase/client";

export interface HealthMetrics {
  pendingPages: number;
  stalledPages: number;
  orphanedPages: number;
  activeJobs: number;
  stalledJobs: number;
  errorRate: number;
  avgProcessingTime: number;
  queueDepth: number;
  systemLoad: number;
}

export interface HealthAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export interface CrawlHealth {
  healthy: boolean;
  metrics: HealthMetrics;
  alerts: HealthAlert[];
  lastHealthCheck: string;
  stalledJobs: number;
}

export class HealthMonitor {
  private static readonly STALLED_PAGE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly STALLED_JOB_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly HIGH_ERROR_RATE_THRESHOLD = 0.1; // 10%
  private static readonly HIGH_QUEUE_DEPTH_THRESHOLD = 100;
  private static currentHealth: CrawlHealth | null = null;

  /**
   * Perform comprehensive health check
   */
  static async performHealthCheck(): Promise<{
    healthy: boolean;
    metrics: HealthMetrics;
    alerts: HealthAlert[];
  }> {
    console.log('🏥 Performing comprehensive health check...');

    const metrics = await this.collectHealthMetrics();
    const alerts = this.analyzeMetrics(metrics);
    const healthy = alerts.filter(a => a.level === 'critical').length === 0;

    // Update current health state
    this.currentHealth = {
      healthy,
      metrics,
      alerts,
      lastHealthCheck: new Date().toISOString(),
      stalledJobs: metrics.stalledJobs
    };

    console.log(`📊 Health check completed: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log(`   • Alerts: ${alerts.length} (${alerts.filter(a => a.level === 'critical').length} critical)`);

    return { healthy, metrics, alerts };
  }

  /**
   * Get current health status
   */
  static getCurrentHealth(): CrawlHealth | null {
    return this.currentHealth;
  }

  /**
   * Collect comprehensive health metrics
   */
  private static async collectHealthMetrics(): Promise<HealthMetrics> {
    const now = new Date();
    const stalledPageThreshold = new Date(now.getTime() - this.STALLED_PAGE_THRESHOLD_MS);
    const stalledJobThreshold = new Date(now.getTime() - this.STALLED_JOB_THRESHOLD_MS);

    try {
      // Get page metrics
      const { count: pendingPages } = await supabase
        .from('source_pages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: stalledPages } = await supabase
        .from('source_pages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('created_at', stalledPageThreshold.toISOString());

      // Get job metrics
      const { count: activeJobs } = await supabase
        .from('background_jobs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'processing']);

      const { count: stalledJobs } = await supabase
        .from('background_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processing')
        .lt('started_at', stalledJobThreshold.toISOString());

      // Calculate error rate (approximate)
      const { data: recentJobs } = await supabase
        .from('background_jobs')
        .select('status')
        .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString()) // Last hour
        .limit(1000);

      const totalRecentJobs = recentJobs?.length || 0;
      const failedJobs = recentJobs?.filter(j => j.status === 'failed').length || 0;
      const errorRate = totalRecentJobs > 0 ? failedJobs / totalRecentJobs : 0;

      // Find orphaned pages (pages without corresponding jobs)
      const { data: pendingPagesData } = await supabase
        .from('source_pages')
        .select('id')
        .eq('status', 'pending')
        .limit(1000);

      let orphanedPages = 0;
      if (pendingPagesData && pendingPagesData.length > 0) {
        const pageIds = pendingPagesData.map(p => p.id);
        const { data: existingJobs } = await supabase
          .from('background_jobs')
          .select('page_id')
          .in('page_id', pageIds);

        const pagesWithJobs = new Set(existingJobs?.map(j => j.page_id) || []);
        orphanedPages = pendingPagesData.filter(p => !pagesWithJobs.has(p.id)).length;
      }

      return {
        pendingPages: pendingPages || 0,
        stalledPages: stalledPages || 0,
        orphanedPages,
        activeJobs: activeJobs || 0,
        stalledJobs: stalledJobs || 0,
        errorRate,
        avgProcessingTime: 0, // Would need more complex query
        queueDepth: (pendingPages || 0) + (activeJobs || 0),
        systemLoad: this.calculateSystemLoad(pendingPages || 0, activeJobs || 0, errorRate)
      };

    } catch (error) {
      console.error('❌ Error collecting health metrics:', error);
      
      // Return empty metrics on error
      return {
        pendingPages: 0,
        stalledPages: 0,
        orphanedPages: 0,
        activeJobs: 0,
        stalledJobs: 0,
        errorRate: 0,
        avgProcessingTime: 0,
        queueDepth: 0,
        systemLoad: 0
      };
    }
  }

  /**
   * Analyze metrics and generate alerts
   */
  private static analyzeMetrics(metrics: HealthMetrics): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const now = new Date().toISOString();

    // Check for stalled pages
    if (metrics.stalledPages > 0) {
      alerts.push({
        level: metrics.stalledPages > 10 ? 'critical' : 'warning',
        message: `${metrics.stalledPages} pages have been pending for over 5 minutes`,
        metric: 'stalledPages',
        value: metrics.stalledPages,
        threshold: 0,
        timestamp: now
      });
    }

    // Check for orphaned pages
    if (metrics.orphanedPages > 0) {
      alerts.push({
        level: metrics.orphanedPages > 5 ? 'critical' : 'warning',
        message: `${metrics.orphanedPages} pages are missing background jobs`,
        metric: 'orphanedPages',
        value: metrics.orphanedPages,
        threshold: 0,
        timestamp: now
      });
    }

    // Check for stalled jobs
    if (metrics.stalledJobs > 0) {
      alerts.push({
        level: 'critical',
        message: `${metrics.stalledJobs} jobs have been processing for over 10 minutes`,
        metric: 'stalledJobs',
        value: metrics.stalledJobs,
        threshold: 0,
        timestamp: now
      });
    }

    // Check error rate
    if (metrics.errorRate > this.HIGH_ERROR_RATE_THRESHOLD) {
      alerts.push({
        level: 'critical',
        message: `High error rate detected: ${(metrics.errorRate * 100).toFixed(1)}%`,
        metric: 'errorRate',
        value: metrics.errorRate,
        threshold: this.HIGH_ERROR_RATE_THRESHOLD,
        timestamp: now
      });
    }

    // Check queue depth
    if (metrics.queueDepth > this.HIGH_QUEUE_DEPTH_THRESHOLD) {
      alerts.push({
        level: 'warning',
        message: `High queue depth: ${metrics.queueDepth} pending items`,
        metric: 'queueDepth',
        value: metrics.queueDepth,
        threshold: this.HIGH_QUEUE_DEPTH_THRESHOLD,
        timestamp: now
      });
    }

    // System load warning
    if (metrics.systemLoad > 80) {
      alerts.push({
        level: metrics.systemLoad > 90 ? 'critical' : 'warning',
        message: `High system load: ${metrics.systemLoad}%`,
        metric: 'systemLoad',
        value: metrics.systemLoad,
        threshold: 80,
        timestamp: now
      });
    }

    return alerts;
  }

  /**
   * Calculate system load percentage based on various factors
   */
  private static calculateSystemLoad(
    pendingPages: number,
    activeJobs: number,
    errorRate: number
  ): number {
    // Simple load calculation based on queue depth and error rate
    const queueLoad = Math.min((pendingPages + activeJobs) / 100, 1) * 60; // Max 60% from queue
    const errorLoad = Math.min(errorRate * 10, 1) * 30; // Max 30% from errors
    const baseLoad = 10; // Base system load

    return Math.round(baseLoad + queueLoad + errorLoad);
  }

  /**
   * Get current health status summary
   */
  static async getHealthSummary(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    score: number;
    alerts: number;
    message: string;
  }> {
    try {
      const { healthy, metrics, alerts } = await this.performHealthCheck();
      
      const criticalAlerts = alerts.filter(a => a.level === 'critical').length;
      const warningAlerts = alerts.filter(a => a.level === 'warning').length;

      let status: 'healthy' | 'degraded' | 'critical';
      let message: string;

      if (criticalAlerts > 0) {
        status = 'critical';
        message = `${criticalAlerts} critical issues detected`;
      } else if (warningAlerts > 0) {
        status = 'degraded';
        message = `${warningAlerts} warnings detected`;
      } else {
        status = 'healthy';
        message = 'All systems operational';
      }

      const score = Math.max(0, 100 - (criticalAlerts * 30) - (warningAlerts * 10));

      return { status, score, alerts: alerts.length, message };

    } catch (error) {
      console.error('❌ Health summary error:', error);
      return {
        status: 'critical',
        score: 0,
        alerts: 0,
        message: 'Health check failed'
      };
    }
  }
}
