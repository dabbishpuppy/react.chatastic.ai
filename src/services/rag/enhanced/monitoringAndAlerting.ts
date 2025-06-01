import { supabase } from "@/integrations/supabase/client";
import { ProductionWorkerQueue } from './productionWorkerQueue';
import { ProductionInfrastructureService } from './productionInfrastructureService';

export interface SystemMetrics {
  timestamp: string;
  queueDepth: number;
  workerUtilization: number;
  errorRate: number;
  avgProcessingTime: number;
  compressionRatio: number;
  storageUsageGB: number;
  activeCustomers: number;
  crawlsCompletedLast24h: number;
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'capacity' | 'security' | 'error_rate';
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: any;
}

export class MonitoringAndAlertingService {
  private static alerts: Alert[] = [];
  private static isMonitoringActive = false;
  private static metricsHistory: SystemMetrics[] = [];
  private static readonly THRESHOLDS = {
    queueDepthCritical: 5000,
    queueDepthHigh: 1000,
    errorRateCritical: 0.20, // 20%
    errorRateHigh: 0.10, // 10%
    processingTimeCritical: 300000, // 5 minutes
    processingTimeHigh: 120000, // 2 minutes
    storageQuotaCritical: 0.95, // 95% of quota
    storageQuotaHigh: 0.80 // 80% of quota
  };

  // Start comprehensive monitoring
  static async startMonitoring(): Promise<void> {
    if (this.isMonitoringActive) {
      console.log('Monitoring already active');
      return;
    }

    this.isMonitoringActive = true;
    console.log('📊 Starting production monitoring and alerting');

    // Collect metrics every 30 seconds
    setInterval(async () => {
      try {
        const metrics = await this.collectSystemMetrics();
        await this.evaluateAlerts(metrics);
        await this.persistMetrics(metrics);
      } catch (error) {
        console.error('Error in monitoring cycle:', error);
      }
    }, 30000);

    // Cleanup old metrics and alerts every hour
    setInterval(async () => {
      await this.cleanupOldData();
    }, 3600000);

    console.log('✅ Monitoring system initialized');
  }

  // Collect comprehensive system metrics
  static async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Get queue metrics
      const queueMetrics = await ProductionWorkerQueue.getQueueMetrics();
      
      // Get infrastructure health
      const infraHealth = await ProductionInfrastructureService.getInfrastructureHealth();
      
      // Calculate error rate
      const totalJobs = queueMetrics.totalCompleted + queueMetrics.totalFailed;
      const errorRate = totalJobs > 0 ? queueMetrics.totalFailed / totalJobs : 0;

      // Get storage metrics (simplified)
      const { data: sources } = await supabase
        .from('agent_sources')
        .select('total_content_size, compressed_content_size')
        .not('total_content_size', 'is', null);

      const totalStorageBytes = sources?.reduce((sum, s) => sum + (s.compressed_content_size || 0), 0) || 0;
      const storageUsageGB = totalStorageBytes / (1024 * 1024 * 1024);

      // Get active customers count
      const { count: activeCustomers } = await supabase
        .from('agent_sources')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Calculate compression ratio
      const totalOriginalSize = sources?.reduce((sum, s) => sum + (s.total_content_size || 0), 0) || 1;
      const totalCompressedSize = sources?.reduce((sum, s) => sum + (s.compressed_content_size || 0), 0) || 1;
      const compressionRatio = totalCompressedSize / totalOriginalSize;

      return {
        timestamp: new Date().toISOString(),
        queueDepth: queueMetrics.queueDepth,
        workerUtilization: queueMetrics.workerUtilization,
        errorRate,
        avgProcessingTime: queueMetrics.averageProcessingTime,
        compressionRatio,
        storageUsageGB,
        activeCustomers: activeCustomers || 0,
        crawlsCompletedLast24h: queueMetrics.totalCompleted
      };
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
      return {
        timestamp: new Date().toISOString(),
        queueDepth: 0,
        workerUtilization: 0,
        errorRate: 0,
        avgProcessingTime: 0,
        compressionRatio: 0,
        storageUsageGB: 0,
        activeCustomers: 0,
        crawlsCompletedLast24h: 0
      };
    }
  }

  // Evaluate and trigger alerts based on metrics
  static async evaluateAlerts(metrics: SystemMetrics): Promise<void> {
    const newAlerts: Alert[] = [];

    // Queue depth alerts
    if (metrics.queueDepth > this.THRESHOLDS.queueDepthCritical) {
      newAlerts.push({
        id: `queue-depth-critical-${Date.now()}`,
        severity: 'critical',
        category: 'capacity',
        message: `Queue depth critical: ${metrics.queueDepth} jobs pending`,
        timestamp: metrics.timestamp,
        resolved: false,
        metadata: { queueDepth: metrics.queueDepth }
      });
    } else if (metrics.queueDepth > this.THRESHOLDS.queueDepthHigh) {
      newAlerts.push({
        id: `queue-depth-high-${Date.now()}`,
        severity: 'high',
        category: 'capacity',
        message: `Queue depth high: ${metrics.queueDepth} jobs pending`,
        timestamp: metrics.timestamp,
        resolved: false,
        metadata: { queueDepth: metrics.queueDepth }
      });
    }

    // Error rate alerts
    if (metrics.errorRate > this.THRESHOLDS.errorRateCritical) {
      newAlerts.push({
        id: `error-rate-critical-${Date.now()}`,
        severity: 'critical',
        category: 'error_rate',
        message: `Error rate critical: ${(metrics.errorRate * 100).toFixed(1)}%`,
        timestamp: metrics.timestamp,
        resolved: false,
        metadata: { errorRate: metrics.errorRate }
      });
    } else if (metrics.errorRate > this.THRESHOLDS.errorRateHigh) {
      newAlerts.push({
        id: `error-rate-high-${Date.now()}`,
        severity: 'high',
        category: 'error_rate',
        message: `Error rate high: ${(metrics.errorRate * 100).toFixed(1)}%`,
        timestamp: metrics.timestamp,
        resolved: false,
        metadata: { errorRate: metrics.errorRate }
      });
    }

    // Processing time alerts
    if (metrics.avgProcessingTime > this.THRESHOLDS.processingTimeCritical) {
      newAlerts.push({
        id: `processing-time-critical-${Date.now()}`,
        severity: 'critical',
        category: 'performance',
        message: `Processing time critical: ${(metrics.avgProcessingTime / 1000).toFixed(1)}s average`,
        timestamp: metrics.timestamp,
        resolved: false,
        metadata: { avgProcessingTime: metrics.avgProcessingTime }
      });
    } else if (metrics.avgProcessingTime > this.THRESHOLDS.processingTimeHigh) {
      newAlerts.push({
        id: `processing-time-high-${Date.now()}`,
        severity: 'high',
        category: 'performance',
        message: `Processing time high: ${(metrics.avgProcessingTime / 1000).toFixed(1)}s average`,
        timestamp: metrics.timestamp,
        resolved: false,
        metadata: { avgProcessingTime: metrics.avgProcessingTime }
      });
    }

    // Storage alerts (assuming 100GB quota per customer)
    const avgStoragePerCustomer = metrics.activeCustomers > 0 ? metrics.storageUsageGB / metrics.activeCustomers : 0;
    const storageQuotaGB = 100; // Per customer quota
    const storageUtilization = avgStoragePerCustomer / storageQuotaGB;

    if (storageUtilization > this.THRESHOLDS.storageQuotaCritical) {
      newAlerts.push({
        id: `storage-quota-critical-${Date.now()}`,
        severity: 'critical',
        category: 'capacity',
        message: `Storage quota critical: ${(storageUtilization * 100).toFixed(1)}% used`,
        timestamp: metrics.timestamp,
        resolved: false,
        metadata: { storageUtilization, storageUsageGB: metrics.storageUsageGB }
      });
    }

    // Add new alerts and log them
    for (const alert of newAlerts) {
      this.alerts.push(alert);
      console.warn(`🚨 ${alert.severity.toUpperCase()} ALERT: ${alert.message}`, alert.metadata);
      
      // In production, this would send notifications (email, Slack, PagerDuty, etc.)
      await this.sendAlert(alert);
    }
  }

  // Send alert notifications (placeholder for real implementations)
  private static async sendAlert(alert: Alert): Promise<void> {
    try {
      // In production, implement actual alerting:
      // - Email notifications
      // - Slack webhooks
      // - PagerDuty integration
      // - SMS alerts for critical issues
      
      console.log(`📧 Sending ${alert.severity} alert: ${alert.message}`);
      
      // For now, just log the alert
      // await emailService.sendAlert(alert);
      // await slackService.sendAlert(alert);
      
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  // Persist metrics for historical analysis (in memory since table doesn't exist)
  private static async persistMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      // Store metrics in memory for historical analysis
      this.metricsHistory.push(metrics);
      
      // Keep only last 1000 entries
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-1000);
      }

      console.log(`📈 Collected metrics: Queue ${metrics.queueDepth}, Error rate ${(metrics.errorRate * 100).toFixed(1)}%, Storage ${metrics.storageUsageGB.toFixed(2)}GB`);
    } catch (error) {
      console.error('Error persisting metrics:', error);
    }
  }

  // Clean up old data to prevent memory bloat
  private static async cleanupOldData(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      // Clean up old metrics
      this.metricsHistory = this.metricsHistory.filter(m => 
        new Date(m.timestamp) > cutoffDate
      );

      // Clean up resolved alerts older than 24 hours
      const alertCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.alerts = this.alerts.filter(alert => 
        !alert.resolved || new Date(alert.timestamp) > alertCutoff
      );

      console.log('🧹 Cleaned up old monitoring data');
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  // Get current alerts
  static getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Get system health summary
  static async getSystemHealthSummary(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    activeAlerts: number;
    criticalAlerts: number;
    lastUpdated: string;
    metrics: SystemMetrics;
  }> {
    const metrics = await this.collectSystemMetrics();
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (activeAlerts.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      lastUpdated: new Date().toISOString(),
      metrics
    };
  }

  // Resolve an alert
  static resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ Resolved alert: ${alert.message}`);
      return true;
    }
    return false;
  }

  // Stop monitoring
  static stopMonitoring(): void {
    this.isMonitoringActive = false;
    console.log('🛑 Monitoring and alerting stopped');
  }
}
