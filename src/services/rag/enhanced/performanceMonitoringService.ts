
import { supabase } from "@/integrations/supabase/client";
import { MetricsCollectionService } from "./metricsCollectionService";
import { AlertingService } from "./alertingService";

export interface PerformanceReport {
  timeRange: {
    start: string;
    end: string;
  };
  systemHealth: {
    overallScore: number;
    cpuUtilization: number;
    memoryUtilization: number;
    diskUtilization: number;
    networkLatency: number;
  };
  crawlPerformance: {
    totalJobsProcessed: number;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
    compressionEfficiency: number;
  };
  customerMetrics: {
    activeCustomers: number;
    averageJobsPerCustomer: number;
    topPerformingCustomers: any[];
    resourceDistribution: any;
  };
  recommendations: string[];
}

export interface BottleneckAnalysis {
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'queue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
  estimatedImprovement: string;
}

export class PerformanceMonitoringService {
  private static monitoringActive = false;
  private static reportingInterval: NodeJS.Timeout | null = null;

  // Start performance monitoring
  static async startMonitoring(): Promise<void> {
    if (this.monitoringActive) {
      console.log('📈 Performance monitoring already active');
      return;
    }

    console.log('📈 Starting performance monitoring...');
    
    // Initialize dependencies
    await AlertingService.initialize();
    MetricsCollectionService.startCollection();

    this.monitoringActive = true;

    // Generate performance reports every 15 minutes
    this.reportingInterval = setInterval(async () => {
      try {
        await this.generatePerformanceReport();
        await this.analyzeBottlenecks();
        await AlertingService.autoResolveAlerts();
      } catch (error) {
        console.error('Error in performance monitoring cycle:', error);
      }
    }, 15 * 60 * 1000);

    console.log('✅ Performance monitoring started');
  }

  // Stop performance monitoring
  static stopMonitoring(): void {
    if (!this.monitoringActive) return;

    console.log('📈 Stopping performance monitoring...');
    
    MetricsCollectionService.stopCollection();
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }

    this.monitoringActive = false;
    console.log('✅ Performance monitoring stopped');
  }

  // Generate comprehensive performance report
  static async generatePerformanceReport(hours: number = 1): Promise<PerformanceReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    console.log(`📊 Generating performance report for ${hours} hour(s)...`);

    // Get metrics data
    const metricsHistory = MetricsCollectionService.getMetricsHistory(hours);
    const currentMetrics = MetricsCollectionService.getCurrentMetrics();

    // Calculate system health
    const systemHealth = this.calculateSystemHealth(metricsHistory.system);
    
    // Calculate crawl performance
    const crawlPerformance = await this.calculateCrawlPerformance(startTime, endTime);
    
    // Calculate customer metrics
    const customerMetrics = await this.calculateCustomerMetrics(startTime, endTime);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(systemHealth, crawlPerformance);

    const report: PerformanceReport = {
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      systemHealth,
      crawlPerformance,
      customerMetrics,
      recommendations
    };

    console.log('📊 Performance report generated');
    return report;
  }

  // Calculate system health metrics
  private static calculateSystemHealth(systemMetrics: any[]): PerformanceReport['systemHealth'] {
    if (systemMetrics.length === 0) {
      return {
        overallScore: 0,
        cpuUtilization: 0,
        memoryUtilization: 0,
        diskUtilization: 0,
        networkLatency: 0
      };
    }

    const avgCpu = systemMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / systemMetrics.length;
    const avgMemory = systemMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / systemMetrics.length;
    const avgDisk = systemMetrics.reduce((sum, m) => sum + m.diskUsage, 0) / systemMetrics.length;
    const avgLatency = systemMetrics.reduce((sum, m) => sum + m.responseTime, 0) / systemMetrics.length;

    const overallScore = Math.round(100 - ((avgCpu + avgMemory + avgDisk) / 3));

    return {
      overallScore: Math.max(0, overallScore),
      cpuUtilization: Math.round(avgCpu),
      memoryUtilization: Math.round(avgMemory),
      diskUtilization: Math.round(avgDisk),
      networkLatency: Math.round(avgLatency)
    };
  }

  // Calculate crawl performance metrics
  private static async calculateCrawlPerformance(startTime: Date, endTime: Date): Promise<PerformanceReport['crawlPerformance']> {
    const { data: jobs } = await supabase
      .from('crawl_jobs')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (!jobs || jobs.length === 0) {
      return {
        totalJobsProcessed: 0,
        averageProcessingTime: 0,
        successRate: 0,
        errorRate: 0,
        throughput: 0,
        compressionEfficiency: 0
      };
    }

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const failedJobs = jobs.filter(j => j.status === 'failed');

    const successRate = totalJobs > 0 ? (completedJobs.length / totalJobs) * 100 : 0;
    const errorRate = totalJobs > 0 ? (failedJobs.length / totalJobs) * 100 : 0;

    const avgProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => sum + (j.processing_time_ms || 0), 0) / completedJobs.length
      : 0;

    const avgCompressionRatio = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => sum + (j.compression_ratio || 0), 0) / completedJobs.length
      : 0;

    const throughput = totalJobs / ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)); // jobs per hour

    return {
      totalJobsProcessed: totalJobs,
      averageProcessingTime: Math.round(avgProcessingTime),
      successRate: Math.round(successRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      compressionEfficiency: Math.round(avgCompressionRatio * 100 * 100) / 100
    };
  }

  // Calculate customer metrics
  private static async calculateCustomerMetrics(startTime: Date, endTime: Date): Promise<PerformanceReport['customerMetrics']> {
    const { data: jobs } = await supabase
      .from('crawl_jobs')
      .select('customer_id, status, processing_time_ms')
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString());

    if (!jobs || jobs.length === 0) {
      return {
        activeCustomers: 0,
        averageJobsPerCustomer: 0,
        topPerformingCustomers: [],
        resourceDistribution: {}
      };
    }

    // Group by customer
    const customerStats = new Map();
    jobs.forEach(job => {
      const customerId = job.customer_id;
      if (!customerStats.has(customerId)) {
        customerStats.set(customerId, {
          customerId,
          totalJobs: 0,
          completedJobs: 0,
          totalProcessingTime: 0
        });
      }

      const stats = customerStats.get(customerId);
      stats.totalJobs++;
      if (job.status === 'completed') {
        stats.completedJobs++;
        stats.totalProcessingTime += job.processing_time_ms || 0;
      }
    });

    const activeCustomers = customerStats.size;
    const averageJobsPerCustomer = jobs.length / activeCustomers;

    const topPerformingCustomers = Array.from(customerStats.values())
      .map(stats => ({
        customerId: stats.customerId,
        jobsCompleted: stats.completedJobs,
        averageProcessingTime: stats.completedJobs > 0 ? stats.totalProcessingTime / stats.completedJobs : 0,
        successRate: stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0
      }))
      .sort((a, b) => b.jobsCompleted - a.jobsCompleted)
      .slice(0, 10);

    return {
      activeCustomers,
      averageJobsPerCustomer: Math.round(averageJobsPerCustomer * 100) / 100,
      topPerformingCustomers,
      resourceDistribution: {
        totalJobs: jobs.length,
        distribution: Array.from(customerStats.values())
      }
    };
  }

  // Generate recommendations based on performance data
  private static generateRecommendations(
    systemHealth: PerformanceReport['systemHealth'],
    crawlPerformance: PerformanceReport['crawlPerformance']
  ): string[] {
    const recommendations: string[] = [];

    // System health recommendations
    if (systemHealth.cpuUtilization > 80) {
      recommendations.push('Consider scaling up CPU resources or optimizing CPU-intensive operations');
    }

    if (systemHealth.memoryUtilization > 85) {
      recommendations.push('Memory usage is high - consider increasing memory allocation or optimizing memory usage');
    }

    if (systemHealth.diskUtilization > 90) {
      recommendations.push('Disk usage is critical - implement data cleanup policies or increase storage capacity');
    }

    if (systemHealth.networkLatency > 1000) {
      recommendations.push('Network latency is high - check network configuration and consider CDN optimization');
    }

    // Crawl performance recommendations
    if (crawlPerformance.errorRate > 5) {
      recommendations.push('Error rate is elevated - investigate common failure patterns and improve error handling');
    }

    if (crawlPerformance.averageProcessingTime > 5000) {
      recommendations.push('Processing time is slow - optimize crawling algorithms and consider parallel processing');
    }

    if (crawlPerformance.compressionEfficiency < 30) {
      recommendations.push('Compression efficiency is low - review compression algorithms and data deduplication');
    }

    if (crawlPerformance.throughput < 10) {
      recommendations.push('Throughput is low - consider increasing worker capacity and optimizing job scheduling');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('System is performing well - continue monitoring and consider proactive optimizations');
    }

    return recommendations;
  }

  // Analyze bottlenecks in the system
  static async analyzeBottlenecks(): Promise<BottleneckAnalysis[]> {
    console.log('🔍 Analyzing system bottlenecks...');

    const bottlenecks: BottleneckAnalysis[] = [];
    const currentMetrics = MetricsCollectionService.getCurrentMetrics();

    if (!currentMetrics.system) {
      return bottlenecks;
    }

    const { system: metrics } = currentMetrics;

    // CPU bottleneck analysis
    if (metrics.cpuUsage > 85) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'high',
        description: `CPU usage at ${metrics.cpuUsage.toFixed(1)}%`,
        impact: 'Slow response times and reduced throughput',
        recommendation: 'Scale up CPU resources or optimize processing algorithms',
        estimatedImprovement: '20-40% performance increase'
      });
    }

    // Memory bottleneck analysis
    if (metrics.memoryUsage > 90) {
      bottlenecks.push({
        type: 'memory',
        severity: 'critical',
        description: `Memory usage at ${metrics.memoryUsage.toFixed(1)}%`,
        impact: 'Risk of out-of-memory errors and system instability',
        recommendation: 'Increase memory allocation or implement memory optimization',
        estimatedImprovement: '30-50% stability improvement'
      });
    }

    // Queue bottleneck analysis
    if (metrics.queueLength > 500) {
      bottlenecks.push({
        type: 'queue',
        severity: metrics.queueLength > 1000 ? 'high' : 'medium',
        description: `Queue backlog of ${metrics.queueLength} jobs`,
        impact: 'Increased job processing delays',
        recommendation: 'Add more workers or optimize job processing',
        estimatedImprovement: '15-30% reduction in processing delays'
      });
    }

    // Network bottleneck analysis
    if (metrics.responseTime > 2000) {
      bottlenecks.push({
        type: 'network',
        severity: 'medium',
        description: `High response time of ${metrics.responseTime.toFixed(0)}ms`,
        impact: 'Poor user experience and reduced efficiency',
        recommendation: 'Optimize network configuration or implement caching',
        estimatedImprovement: '25-45% response time improvement'
      });
    }

    console.log(`🔍 Found ${bottlenecks.length} bottlenecks`);
    return bottlenecks;
  }

  // Get current system status
  static getSystemStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    healthScore: number;
    activeAlerts: number;
    criticalAlerts: number;
  } {
    const healthScore = MetricsCollectionService.getSystemHealthScore();
    const activeAlerts = AlertingService.getActiveAlerts().length;
    const criticalAlerts = AlertingService.getCriticalAlertsCount();

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (criticalAlerts > 0 || healthScore < 50) {
      status = 'critical';
    } else if (activeAlerts > 0 || healthScore < 80) {
      status = 'degraded';
    }

    return {
      status,
      healthScore,
      activeAlerts,
      criticalAlerts
    };
  }
}
