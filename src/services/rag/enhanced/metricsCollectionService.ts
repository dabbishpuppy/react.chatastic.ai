import { supabase } from "@/integrations/supabase/client";

export interface SystemMetrics {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  queueLength: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
}

export interface CrawlMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  compressionRatio: number;
  dataProcessedGB: number;
  customersActive: number;
  queueHealth: number;
}

export interface AlertThreshold {
  metricName: string;
  threshold: number;
  operator: '>' | '<' | '=' | '>=' | '<=';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export class MetricsCollectionService {
  private static metricsBuffer: SystemMetrics[] = [];
  private static crawlMetricsBuffer: CrawlMetrics[] = [];
  private static isCollecting = false;
  
  private static readonly DEFAULT_THRESHOLDS: AlertThreshold[] = [
    { metricName: 'cpuUsage', threshold: 80, operator: '>', severity: 'high', enabled: true },
    { metricName: 'memoryUsage', threshold: 85, operator: '>', severity: 'high', enabled: true },
    { metricName: 'diskUsage', threshold: 90, operator: '>', severity: 'critical', enabled: true },
    { metricName: 'errorRate', threshold: 5, operator: '>', severity: 'medium', enabled: true },
    { metricName: 'responseTime', threshold: 2000, operator: '>', severity: 'medium', enabled: true },
    { metricName: 'queueLength', threshold: 1000, operator: '>', severity: 'high', enabled: true }
  ];

  // Start collecting metrics
  static startCollection(): void {
    if (this.isCollecting) {
      console.log('📊 Metrics collection already running');
      return;
    }

    this.isCollecting = true;
    console.log('📊 Starting metrics collection...');

    // Collect system metrics every 30 seconds
    setInterval(async () => {
      try {
        const metrics = await this.collectSystemMetrics();
        this.metricsBuffer.push(metrics);
        
        // Keep only last 100 metrics in buffer
        if (this.metricsBuffer.length > 100) {
          this.metricsBuffer = this.metricsBuffer.slice(-100);
        }

        // Check thresholds
        await this.checkAlertThresholds(metrics);
      } catch (error) {
        console.error('Error collecting system metrics:', error);
      }
    }, 30000);

    // Collect crawl metrics every minute
    setInterval(async () => {
      try {
        const metrics = await this.collectCrawlMetrics();
        this.crawlMetricsBuffer.push(metrics);
        
        // Keep only last 60 metrics in buffer
        if (this.crawlMetricsBuffer.length > 60) {
          this.crawlMetricsBuffer = this.crawlMetricsBuffer.slice(-60);
        }
      } catch (error) {
        console.error('Error collecting crawl metrics:', error);
      }
    }, 60000);

    // Persist metrics to database every 5 minutes
    setInterval(async () => {
      await this.persistMetrics();
    }, 300000);
  }

  // Stop collecting metrics
  static stopCollection(): void {
    this.isCollecting = false;
    console.log('📊 Stopped metrics collection');
  }

  // Collect system metrics
  private static async collectSystemMetrics(): Promise<SystemMetrics> {
    // Simulate system metrics collection
    // In production, this would use actual system monitoring
    const baseMetrics = {
      timestamp: new Date().toISOString(),
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      activeConnections: Math.floor(Math.random() * 500) + 50,
      responseTime: Math.random() * 1000 + 100,
      errorRate: Math.random() * 10,
      throughput: Math.random() * 1000 + 100
    };

    // Get actual queue length from database
    const { count: queueLength } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return {
      ...baseMetrics,
      queueLength: queueLength || 0
    };
  }

  // Collect crawl-specific metrics
  private static async collectCrawlMetrics(): Promise<CrawlMetrics> {
    // Get job statistics
    const { data: jobStats } = await supabase
      .from('crawl_jobs')
      .select('status, processing_time_ms, compression_ratio, content_size, customer_id');

    const totalJobs = jobStats?.length || 0;
    const completedJobs = jobStats?.filter(j => j.status === 'completed').length || 0;
    const failedJobs = jobStats?.filter(j => j.status === 'failed').length || 0;
    
    const completedJobsData = jobStats?.filter(j => j.status === 'completed') || [];
    const averageProcessingTime = completedJobsData.length > 0 
      ? completedJobsData.reduce((sum, j) => sum + (j.processing_time_ms || 0), 0) / completedJobsData.length
      : 0;

    const compressionRatio = completedJobsData.length > 0
      ? completedJobsData.reduce((sum, j) => sum + (j.compression_ratio || 0), 0) / completedJobsData.length
      : 0;

    const dataProcessedGB = completedJobsData.reduce((sum, j) => sum + (j.content_size || 0), 0) / (1024 * 1024 * 1024);

    const customersActive = new Set(jobStats?.map(j => j.customer_id)).size;

    // Calculate queue health (0-100 scale)
    const pendingJobs = jobStats?.filter(j => j.status === 'pending').length || 0;
    const queueHealth = Math.max(0, 100 - (pendingJobs / 100)); // Simple health calculation

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      averageProcessingTime,
      compressionRatio,
      dataProcessedGB,
      customersActive,
      queueHealth
    };
  }

  // Check alert thresholds
  private static async checkAlertThresholds(metrics: SystemMetrics): Promise<void> {
    for (const threshold of this.DEFAULT_THRESHOLDS) {
      if (!threshold.enabled) continue;

      const value = (metrics as any)[threshold.metricName];
      if (value === undefined) continue;

      let triggered = false;
      switch (threshold.operator) {
        case '>':
          triggered = value > threshold.threshold;
          break;
        case '<':
          triggered = value < threshold.threshold;
          break;
        case '>=':
          triggered = value >= threshold.threshold;
          break;
        case '<=':
          triggered = value <= threshold.threshold;
          break;
        case '=':
          triggered = value === threshold.threshold;
          break;
      }

      if (triggered) {
        await this.triggerAlert({
          metricName: threshold.metricName,
          currentValue: value,
          threshold: threshold.threshold,
          severity: threshold.severity,
          timestamp: metrics.timestamp,
          message: `${threshold.metricName} is ${value}, exceeding threshold of ${threshold.threshold}`
        });
      }
    }
  }

  // Trigger an alert
  private static async triggerAlert(alert: {
    metricName: string;
    currentValue: number;
    threshold: number;
    severity: string;
    timestamp: string;
    message: string;
  }): Promise<void> {
    console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Store alert in database or send notification
    // This would integrate with notification services like email, Slack, etc.
    
    // For now, just log the alert
    const alertRecord = {
      metric_name: alert.metricName,
      current_value: alert.currentValue,
      threshold_value: alert.threshold,
      severity: alert.severity,
      message: alert.message,
      triggered_at: alert.timestamp,
      acknowledged: false
    };

    console.log('Alert details:', alertRecord);
  }

  // Persist metrics to database
  private static async persistMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0 && this.crawlMetricsBuffer.length === 0) {
      return;
    }

    try {
      // In a real implementation, you would store these in a metrics table
      console.log(`📊 Persisting ${this.metricsBuffer.length} system metrics and ${this.crawlMetricsBuffer.length} crawl metrics`);
      
      // Clear buffers after persistence
      this.metricsBuffer = [];
      this.crawlMetricsBuffer = [];
    } catch (error) {
      console.error('Error persisting metrics:', error);
    }
  }

  // Get current metrics snapshot
  static getCurrentMetrics(): {
    system: SystemMetrics | null;
    crawl: CrawlMetrics | null;
  } {
    return {
      system: this.metricsBuffer[this.metricsBuffer.length - 1] || null,
      crawl: this.crawlMetricsBuffer[this.crawlMetricsBuffer.length - 1] || null
    };
  }

  // Get metrics history
  static getMetricsHistory(hours: number = 1): {
    system: SystemMetrics[];
    crawl: CrawlMetrics[];
  } {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return {
      system: this.metricsBuffer.filter(m => new Date(m.timestamp) > cutoff),
      crawl: this.crawlMetricsBuffer.filter(m => new Date(this.crawlMetricsBuffer[0]?.timestamp || '') > cutoff)
    };
  }

  // Get system health score
  static getSystemHealthScore(): number {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics.system) return 0;

    const { cpuUsage, memoryUsage, diskUsage, errorRate } = currentMetrics.system;
    
    // Calculate health score (0-100)
    const cpuScore = Math.max(0, 100 - cpuUsage);
    const memoryScore = Math.max(0, 100 - memoryUsage);
    const diskScore = Math.max(0, 100 - diskUsage);
    const errorScore = Math.max(0, 100 - (errorRate * 10));
    
    return Math.round((cpuScore + memoryScore + diskScore + errorScore) / 4);
  }
}
