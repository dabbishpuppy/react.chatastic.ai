import { supabase } from "@/integrations/supabase/client";
import { AutoscalingService } from "./autoscalingService";
import { AlertingService } from "./alertingService";
import { PerformanceMonitoringService } from "./performanceMonitoringService";

export interface InfrastructureHealth {
  overallScore: number;
  components: {
    database: ComponentHealth;
    workers: ComponentHealth;
    storage: ComponentHealth;
    networking: ComponentHealth;
    autoscaling: ComponentHealth;
  };
  alerts: number;
  uptime: number;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical';
  score: number;
  latency?: number;
  errorRate?: number;
  utilization?: number;
  details: string[];
}

export interface ResourceUsage {
  timestamp: string;
  cpu: {
    total: number;
    available: number;
    utilization: number;
  };
  memory: {
    total: number;
    available: number;
    utilization: number;
  };
  storage: {
    total: number;
    used: number;
    utilization: number;
  };
  network: {
    inbound: number;
    outbound: number;
    latency: number;
  };
}

export interface CostOptimization {
  currentMonthlyCost: number;
  projectedMonthlyCost: number;
  optimizations: {
    type: string;
    description: string;
    potentialSavings: number;
    implementationEffort: 'low' | 'medium' | 'high';
    riskLevel: 'low' | 'medium' | 'high';
  }[];
}

export class InfrastructureMonitoringService {
  private static monitoringActive = false;
  private static healthHistory: InfrastructureHealth[] = [];
  private static resourceHistory: ResourceUsage[] = [];

  // Start infrastructure monitoring
  static async startMonitoring(): Promise<void> {
    if (this.monitoringActive) {
      console.log('🏗️ Infrastructure monitoring already active');
      return;
    }

    console.log('🏗️ Starting infrastructure monitoring...');
    this.monitoringActive = true;

    // Initialize dependent services
    await AlertingService.initialize();
    await PerformanceMonitoringService.startMonitoring();
    await AutoscalingService.startAutoscaling();

    // Monitor infrastructure health every 5 minutes
    setInterval(async () => {
      try {
        await this.collectInfrastructureHealth();
      } catch (error) {
        console.error('Error collecting infrastructure health:', error);
      }
    }, 300000);

    // Monitor resource usage every minute
    setInterval(async () => {
      try {
        await this.collectResourceUsage();
      } catch (error) {
        console.error('Error collecting resource usage:', error);
      }
    }, 60000);

    // Generate cost optimization reports every hour
    setInterval(async () => {
      try {
        await this.generateCostOptimizationReport();
      } catch (error) {
        console.error('Error generating cost optimization report:', error);
      }
    }, 3600000);

    console.log('✅ Infrastructure monitoring started');
  }

  // Stop infrastructure monitoring
  static stopMonitoring(): void {
    this.monitoringActive = false;
    AutoscalingService.stopAutoscaling();
    PerformanceMonitoringService.stopMonitoring();
    console.log('🏗️ Infrastructure monitoring stopped');
  }

  // Collect infrastructure health metrics
  private static async collectInfrastructureHealth(): Promise<void> {
    const health = await this.calculateInfrastructureHealth();
    
    this.healthHistory.push(health);
    
    // Keep only last 288 records (24 hours at 5-minute intervals)
    if (this.healthHistory.length > 288) {
      this.healthHistory = this.healthHistory.slice(-288);
    }

    // Create alerts for critical issues
    if (health.overallScore < 50) {
      await AlertingService.createAlert({
        type: 'performance',
        severity: 'critical',
        title: 'Infrastructure Health Critical',
        message: `Overall infrastructure health score dropped to ${health.overallScore}%`,
        source: 'infrastructure-monitoring',
        metadata: { health }
      });
    }

    console.log(`🏗️ Infrastructure health: ${health.overallScore}% (${this.getHealthStatusText(health.overallScore)})`);
  }

  // Calculate infrastructure health
  private static async calculateInfrastructureHealth(): Promise<InfrastructureHealth> {
    const [database, workers, storage, networking, autoscaling] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkWorkersHealth(),
      this.checkStorageHealth(),
      this.checkNetworkingHealth(),
      this.checkAutoscalingHealth()
    ]);

    const components = { database, workers, storage, networking, autoscaling };
    const scores = Object.values(components).map(c => c.score);
    const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

    const activeAlerts = AlertingService.getActiveAlerts().length;
    const uptime = this.calculateUptime();

    return {
      overallScore,
      components,
      alerts: activeAlerts,
      uptime
    };
  }

  // Check database health
  private static async checkDatabaseHealth(): Promise<ComponentHealth> {
    const details: string[] = [];
    let score = 100;
    let status: ComponentHealth['status'] = 'healthy';

    try {
      // Test database connectivity and performance
      const start = Date.now();
      const { count } = await supabase
        .from('crawl_jobs')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      const latency = Date.now() - start;
      
      if (latency > 1000) {
        score -= 30;
        status = 'degraded';
        details.push(`High database latency: ${latency}ms`);
      } else if (latency > 500) {
        score -= 15;
        details.push(`Moderate database latency: ${latency}ms`);
      } else {
        details.push(`Database latency normal: ${latency}ms`);
      }

      // Check for connection pool health
      const connectionHealth = await this.checkConnectionPoolHealth();
      if (!connectionHealth.healthy) {
        score -= 20;
        status = connectionHealth.critical ? 'critical' : 'degraded';
        details.push(...connectionHealth.issues);
      }

      details.push(`Query response time: ${latency}ms`);
      
    } catch (error) {
      score = 0;
      status = 'critical';
      details.push(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { status, score: Math.max(0, score), latency: 0, details };
  }

  // Check workers health
  private static async checkWorkersHealth(): Promise<ComponentHealth> {
    const details: string[] = [];
    let score = 100;
    let status: ComponentHealth['status'] = 'healthy';

    try {
      const autoscalingStatus = await AutoscalingService.getAutoscalingStatus();
      const totalInstances = autoscalingStatus.currentWorkers;
      const recentFailures = autoscalingStatus.recentEvents.filter(e => e.action === 'scale_up').length;

      if (totalInstances === 0) {
        score = 0;
        status = 'critical';
        details.push('No active worker instances');
      } else if (recentFailures > 5) {
        score -= 40;
        status = 'degraded';
        details.push(`Multiple scaling events: ${recentFailures} scale-ups recently`);
      }

      // Check queue health
      const systemStatus = await PerformanceMonitoringService.getSystemStatus();
      if (systemStatus.criticalAlerts > 0) {
        score -= 30;
        status = 'critical';
        details.push(`${systemStatus.criticalAlerts} critical alerts active`);
      }

      details.push(`Active instances: ${totalInstances}`);
      details.push(`Health score: ${systemStatus.healthScore}%`);
    } catch (error) {
      score = 50;
      status = 'degraded';
      details.push(`Failed to check workers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { status, score: Math.max(0, score), details };
  }

  // Check storage health
  private static async checkStorageHealth(): Promise<ComponentHealth> {
    const details: string[] = [];
    let score = 100;
    let status: ComponentHealth['status'] = 'healthy';

    try {
      // Get storage metrics
      const { data: sources } = await supabase
        .from('agent_sources')
        .select('total_content_size, compressed_content_size')
        .not('total_content_size', 'is', null);

      const totalSize = sources?.reduce((sum, s) => sum + (s.total_content_size || 0), 0) || 0;
      const compressedSize = sources?.reduce((sum, s) => sum + (s.compressed_content_size || 0), 0) || 0;

      const compressionRatio = totalSize > 0 ? compressedSize / totalSize : 1;
      const utilizationGB = compressedSize / (1024 * 1024 * 1024);

      // Simulate storage quotas
      const storageQuotaGB = 1000; // 1TB quota
      const utilization = (utilizationGB / storageQuotaGB) * 100;

      if (utilization > 90) {
        score -= 50;
        status = 'critical';
        details.push(`Storage nearly full: ${utilization.toFixed(1)}%`);
      } else if (utilization > 75) {
        score -= 25;
        status = 'degraded';
        details.push(`Storage high: ${utilization.toFixed(1)}%`);
      }

      if (compressionRatio > 0.8) {
        score -= 15;
        details.push(`Poor compression ratio: ${(compressionRatio * 100).toFixed(1)}%`);
      }

      details.push(`Storage used: ${utilizationGB.toFixed(2)}GB of ${storageQuotaGB}GB`);
      details.push(`Compression ratio: ${(compressionRatio * 100).toFixed(1)}%`);

    } catch (error) {
      score = 0;
      status = 'critical';
      details.push(`Storage health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { status, score: Math.max(0, score), utilization: 0, details };
  }

  // Check networking health
  private static async checkNetworkingHealth(): Promise<ComponentHealth> {
    const details: string[] = [];
    let score = 100;
    let status: ComponentHealth['status'] = 'healthy';
    let latency = 0;

    try {
      // Test network latency to Supabase
      const start = Date.now();
      await supabase.from('agents').select('id').limit(1).single();
      latency = Date.now() - start;

      if (latency > 2000) {
        score -= 40;
        status = 'critical';
        details.push(`Critical network latency: ${latency}ms`);
      } else if (latency > 1000) {
        score -= 20;
        status = 'degraded';
        details.push(`High network latency: ${latency}ms`);
      } else {
        details.push(`Network latency normal: ${latency}ms`);
      }

      // Check for network errors (simulated)
      const errorRate = Math.random() * 5; // 0-5% error rate
      if (errorRate > 3) {
        score -= 25;
        status = 'degraded';
        details.push(`Network error rate: ${errorRate.toFixed(1)}%`);
      }

      details.push(`Network connectivity: OK`);

    } catch (error) {
      score = 0;
      status = 'critical';
      latency = 9999;
      details.push(`Network connectivity failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { status, score: Math.max(0, score), latency, details };
  }

  // Check autoscaling health
  private static async checkAutoscalingHealth(): Promise<ComponentHealth> {
    const details: string[] = [];
    let score = 100;
    let status: ComponentHealth['status'] = 'healthy';

    try {
      const autoscalingStatus = await AutoscalingService.getAutoscalingStatus();

      if (!autoscalingStatus.active) {
        score -= 30;
        status = 'degraded';
        details.push('Autoscaling is disabled');
      }

      const recentDecisions = autoscalingStatus.recentEvents.slice(-10);
      const failedScaling = recentDecisions.filter(d => d.action.includes('failed')).length;

      if (failedScaling > 3) {
        score -= 25;
        status = 'degraded';
        details.push(`${failedScaling} failed scaling decisions recently`);
      }

      const totalInstances = autoscalingStatus.currentWorkers;
      const maxPossibleInstances = 100; // Simulated max capacity

      if (totalInstances / maxPossibleInstances > 0.8) {
        score -= 20;
        details.push('Approaching maximum scaling capacity');
      }

      details.push(`Autoscaling: ${autoscalingStatus.active ? 'Enabled' : 'Disabled'}`);
      details.push(`Total instances: ${totalInstances}`);
      details.push(`Recent decisions: ${recentDecisions.length}`);
    } catch (error) {
      score = 50;
      status = 'degraded';
      details.push(`Failed to check autoscaling: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { status, score: Math.max(0, score), details };
  }

  // Check connection pool health
  private static async checkConnectionPoolHealth(): Promise<{
    healthy: boolean;
    critical: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let healthy = true;
    let critical = false;

    try {
      // Check if connection pool config exists
      const { data: poolConfigs } = await supabase
        .from('connection_pool_config')
        .select('*');

      if (!poolConfigs || poolConfigs.length === 0) {
        issues.push('No connection pool configuration found');
        healthy = false;
      } else {
        poolConfigs.forEach(config => {
          if (config.max_connections < 50) {
            issues.push(`Low max connections in pool ${config.pool_name}: ${config.max_connections}`);
            healthy = false;
          }
        });
      }

    } catch (error) {
      issues.push('Failed to check connection pool health');
      healthy = false;
      critical = true;
    }

    return { healthy, critical, issues };
  }

  // Collect resource usage
  private static async collectResourceUsage(): Promise<void> {
    const usage: ResourceUsage = {
      timestamp: new Date().toISOString(),
      cpu: {
        total: 100,
        available: 100 - (Math.random() * 80), // Simulate 0-80% usage
        utilization: Math.random() * 80
      },
      memory: {
        total: 32 * 1024, // 32GB
        available: 32 * 1024 - (Math.random() * 20 * 1024), // Use up to 20GB
        utilization: Math.random() * 75
      },
      storage: {
        total: 1000 * 1024, // 1TB
        used: Math.random() * 500 * 1024, // Use up to 500GB
        utilization: Math.random() * 50
      },
      network: {
        inbound: Math.random() * 1000, // MB/s
        outbound: Math.random() * 800,
        latency: Math.random() * 100 + 50 // 50-150ms
      }
    };

    this.resourceHistory.push(usage);

    // Keep only last 1440 records (24 hours at 1-minute intervals)
    if (this.resourceHistory.length > 1440) {
      this.resourceHistory = this.resourceHistory.slice(-1440);
    }
  }

  // Generate cost optimization report
  private static async generateCostOptimizationReport(): Promise<CostOptimization> {
    const autoscalingStatus = await AutoscalingService.getAutoscalingStatus();
    const currentMonthlyCost = autoscalingStatus.currentWorkers * 100; // $100 per worker

    const optimizations = [
      {
        type: 'Right-sizing',
        description: 'Reduce over-provisioned worker instances during low-traffic periods',
        potentialSavings: currentMonthlyCost * 0.15,
        implementationEffort: 'low' as const,
        riskLevel: 'low' as const
      },
      {
        type: 'Reserved Instances',
        description: 'Use reserved instances for baseline capacity',
        potentialSavings: currentMonthlyCost * 0.25,
        implementationEffort: 'medium' as const,
        riskLevel: 'low' as const
      },
      {
        type: 'Spot Instances',
        description: 'Use spot instances for batch processing workloads',
        potentialSavings: currentMonthlyCost * 0.35,
        implementationEffort: 'high' as const,
        riskLevel: 'medium' as const
      }
    ];

    const totalSavings = optimizations.reduce((sum, opt) => sum + opt.potentialSavings, 0);
    const projectedMonthlyCost = currentMonthlyCost - totalSavings;

    console.log(`💰 Cost optimization: Current $${currentMonthlyCost.toFixed(0)}/month, Potential savings $${totalSavings.toFixed(0)}/month`);

    return {
      currentMonthlyCost,
      projectedMonthlyCost,
      optimizations
    };
  }

  // Calculate uptime percentage
  private static calculateUptime(): number {
    if (this.healthHistory.length === 0) return 100;

    const healthyPeriods = this.healthHistory.filter(h => h.overallScore >= 80).length;
    return (healthyPeriods / this.healthHistory.length) * 100;
  }

  // Get health status text
  private static getHealthStatusText(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  }

  // Get current infrastructure status
  static async getCurrentInfrastructureStatus(): Promise<{
    health: InfrastructureHealth;
    resourceUsage: ResourceUsage | null;
    autoscaling: any;
    costOptimization: CostOptimization;
  }> {
    const health = await this.calculateInfrastructureHealth();
    const resourceUsage = this.resourceHistory[this.resourceHistory.length - 1] || null;
    const autoscaling = await AutoscalingService.getAutoscalingStatus();
    const costOptimization = await this.generateCostOptimizationReport();

    return {
      health,
      resourceUsage,
      autoscaling,
      costOptimization
    };
  }

  // Get infrastructure metrics history
  static getInfrastructureHistory(hours: number = 24): {
    health: InfrastructureHealth[];
    resourceUsage: ResourceUsage[];
  } {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return {
      health: this.healthHistory.filter(h => new Date(h.components.database.details[0]) > cutoff),
      resourceUsage: this.resourceHistory.filter(r => new Date(r.timestamp) > cutoff)
    };
  }
}
