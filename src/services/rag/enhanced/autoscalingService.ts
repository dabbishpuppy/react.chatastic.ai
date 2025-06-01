import { supabase } from "@/integrations/supabase/client";
import { MetricsCollectionService } from "./metricsCollectionService";
import { AlertingService } from "./alertingService";

export interface WorkerPool {
  name: string;
  type: 'high_performance' | 'standard' | 'batch_processing';
  minInstances: number;
  maxInstances: number;
  currentInstances: number;
  targetCPU: number;
  targetMemory: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  isActive: boolean;
}

export interface ScalingMetrics {
  timestamp: string;
  poolName: string;
  cpuUtilization: number;
  memoryUtilization: number;
  queueDepth: number;
  activeJobs: number;
  pendingJobs: number;
  avgProcessingTime: number;
  errorRate: number;
}

export interface AutoscalingDecision {
  poolName: string;
  action: 'scale_up' | 'scale_down' | 'no_change';
  currentInstances: number;
  targetInstances: number;
  reason: string;
  confidence: number;
  estimatedSavings?: number;
}

export class AutoscalingService {
  private static workerPools: WorkerPool[] = [
    {
      name: 'high_performance',
      type: 'high_performance',
      minInstances: 2,
      maxInstances: 50,
      currentInstances: 5,
      targetCPU: 70,
      targetMemory: 80,
      scaleUpThreshold: 85,
      scaleDownThreshold: 40,
      isActive: true
    },
    {
      name: 'standard',
      type: 'standard',
      minInstances: 5,
      maxInstances: 100,
      currentInstances: 10,
      targetCPU: 75,
      targetMemory: 85,
      scaleUpThreshold: 80,
      scaleDownThreshold: 50,
      isActive: true
    },
    {
      name: 'batch_processing',
      type: 'batch_processing',
      minInstances: 1,
      maxInstances: 200,
      currentInstances: 15,
      targetCPU: 90,
      targetMemory: 95,
      scaleUpThreshold: 95,
      scaleDownThreshold: 60,
      isActive: true
    }
  ];

  private static scalingHistory: AutoscalingDecision[] = [];
  private static isAutoscalingEnabled = true;

  // Start autoscaling monitoring
  static startAutoscaling(): void {
    if (!this.isAutoscalingEnabled) {
      console.log('🔧 Autoscaling is disabled');
      return;
    }

    console.log('🚀 Starting autoscaling service...');

    // Run scaling decisions every 2 minutes
    setInterval(async () => {
      try {
        await this.evaluateScalingDecisions();
      } catch (error) {
        console.error('Error in autoscaling evaluation:', error);
      }
    }, 120000);

    // Collect scaling metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.collectScalingMetrics();
      } catch (error) {
        console.error('Error collecting scaling metrics:', error);
      }
    }, 30000);

    console.log('✅ Autoscaling service started');
  }

  // Stop autoscaling
  static stopAutoscaling(): void {
    this.isAutoscalingEnabled = false;
    console.log('🛑 Autoscaling service stopped');
  }

  // Evaluate scaling decisions for all pools
  static async evaluateScalingDecisions(): Promise<AutoscalingDecision[]> {
    const decisions: AutoscalingDecision[] = [];

    for (const pool of this.workerPools) {
      if (!pool.isActive) continue;

      const metrics = await this.getPoolMetrics(pool.name);
      const decision = this.calculateScalingDecision(pool, metrics);
      
      decisions.push(decision);

      // Execute scaling action if needed
      if (decision.action !== 'no_change') {
        await this.executeScalingAction(decision);
      }
    }

    // Store decisions in history
    this.scalingHistory.push(...decisions);
    
    // Keep only last 1000 decisions
    if (this.scalingHistory.length > 1000) {
      this.scalingHistory = this.scalingHistory.slice(-1000);
    }

    return decisions;
  }

  // Calculate scaling decision for a pool
  private static calculateScalingDecision(pool: WorkerPool, metrics: ScalingMetrics): AutoscalingDecision {
    const { cpuUtilization, memoryUtilization, queueDepth, pendingJobs, errorRate } = metrics;
    
    // Calculate utilization score
    const avgUtilization = (cpuUtilization + memoryUtilization) / 2;
    
    // Scale up conditions
    if (
      avgUtilization > pool.scaleUpThreshold ||
      queueDepth > 100 ||
      pendingJobs > pool.currentInstances * 10 ||
      errorRate > 10
    ) {
      const targetInstances = Math.min(
        pool.maxInstances,
        Math.ceil(pool.currentInstances * 1.5)
      );

      return {
        poolName: pool.name,
        action: 'scale_up',
        currentInstances: pool.currentInstances,
        targetInstances,
        reason: `High utilization: ${avgUtilization.toFixed(1)}%, Queue: ${queueDepth}, Pending: ${pendingJobs}`,
        confidence: this.calculateConfidence(metrics, 'scale_up')
      };
    }

    // Scale down conditions
    if (
      avgUtilization < pool.scaleDownThreshold &&
      queueDepth < 10 &&
      pendingJobs < pool.currentInstances * 2 &&
      errorRate < 2
    ) {
      const targetInstances = Math.max(
        pool.minInstances,
        Math.floor(pool.currentInstances * 0.8)
      );

      if (targetInstances < pool.currentInstances) {
        const estimatedSavings = (pool.currentInstances - targetInstances) * 50; // $50 per instance per hour

        return {
          poolName: pool.name,
          action: 'scale_down',
          currentInstances: pool.currentInstances,
          targetInstances,
          reason: `Low utilization: ${avgUtilization.toFixed(1)}%, Queue: ${queueDepth}`,
          confidence: this.calculateConfidence(metrics, 'scale_down'),
          estimatedSavings
        };
      }
    }

    return {
      poolName: pool.name,
      action: 'no_change',
      currentInstances: pool.currentInstances,
      targetInstances: pool.currentInstances,
      reason: `Stable utilization: ${avgUtilization.toFixed(1)}%`,
      confidence: 100
    };
  }

  // Calculate confidence score for scaling decision
  private static calculateConfidence(metrics: ScalingMetrics, action: 'scale_up' | 'scale_down'): number {
    const { cpuUtilization, memoryUtilization, queueDepth, errorRate } = metrics;
    
    let confidence = 80; // Base confidence
    
    // Higher confidence for clear resource pressure
    if (action === 'scale_up') {
      if (cpuUtilization > 90) confidence += 10;
      if (memoryUtilization > 90) confidence += 10;
      if (queueDepth > 200) confidence += 10;
      if (errorRate > 15) confidence += 10;
    }
    
    // Higher confidence for sustained low utilization
    if (action === 'scale_down') {
      if (cpuUtilization < 30 && memoryUtilization < 30) confidence += 15;
      if (queueDepth === 0) confidence += 5;
      if (errorRate === 0) confidence += 5;
    }
    
    return Math.min(confidence, 100);
  }

  // Execute scaling action
  private static async executeScalingAction(decision: AutoscalingDecision): Promise<void> {
    console.log(`🎯 Executing scaling action for ${decision.poolName}: ${decision.action} (${decision.currentInstances} → ${decision.targetInstances})`);
    
    const pool = this.workerPools.find(p => p.name === decision.poolName);
    if (!pool) return;

    // Update current instances
    pool.currentInstances = decision.targetInstances;

    // In a real implementation, this would:
    // 1. Update Kubernetes deployment replicas
    // 2. Trigger serverless function scaling
    // 3. Adjust container orchestration settings
    // 4. Update load balancer configuration

    // Simulate scaling action
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create alert for significant scaling events
    if (Math.abs(decision.currentInstances - decision.targetInstances) > 5) {
      await AlertingService.createAlert({
        type: 'capacity',
        severity: decision.action === 'scale_up' ? 'medium' : 'low',
        title: `Autoscaling: ${decision.action.replace('_', ' ')} ${decision.poolName}`,
        message: `Scaled ${decision.poolName} from ${decision.currentInstances} to ${decision.targetInstances} instances. Reason: ${decision.reason}`,
        source: 'autoscaling-service',
        metadata: decision
      });
    }

    console.log(`✅ Scaling completed for ${decision.poolName}`);
  }

  // Collect scaling metrics for a pool
  private static async collectScalingMetrics(): Promise<void> {
    for (const pool of this.workerPools) {
      if (!pool.isActive) continue;

      const metrics = await this.getPoolMetrics(pool.name);
      
      // Store metrics for analysis (in real implementation, this would go to a time-series database)
      console.log(`📊 Pool ${pool.name} metrics:`, {
        instances: pool.currentInstances,
        cpu: metrics.cpuUtilization.toFixed(1) + '%',
        memory: metrics.memoryUtilization.toFixed(1) + '%',
        queue: metrics.queueDepth,
        pending: metrics.pendingJobs
      });
    }
  }

  // Get metrics for a specific pool
  private static async getPoolMetrics(poolName: string): Promise<ScalingMetrics> {
    // Get current system metrics
    const currentMetrics = MetricsCollectionService.getCurrentMetrics();
    
    // Get job queue metrics
    const { count: pendingJobs } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: activeJobs } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    // Calculate pool-specific metrics based on workload distribution
    const poolMultiplier = this.getPoolLoadMultiplier(poolName);
    
    return {
      timestamp: new Date().toISOString(),
      poolName,
      cpuUtilization: (currentMetrics.system?.cpuUsage || 0) * poolMultiplier,
      memoryUtilization: (currentMetrics.system?.memoryUsage || 0) * poolMultiplier,
      queueDepth: (currentMetrics.system?.queueLength || 0) * poolMultiplier,
      activeJobs: (activeJobs || 0) * poolMultiplier,
      pendingJobs: (pendingJobs || 0) * poolMultiplier,
      avgProcessingTime: currentMetrics.system?.responseTime || 0,
      errorRate: currentMetrics.system?.errorRate || 0
    };
  }

  // Get load multiplier for different pool types
  private static getPoolLoadMultiplier(poolName: string): number {
    switch (poolName) {
      case 'high_performance':
        return 0.3; // Handles 30% of total load
      case 'standard':
        return 0.5; // Handles 50% of total load
      case 'batch_processing':
        return 0.2; // Handles 20% of total load
      default:
        return 1.0;
    }
  }

  // Get autoscaling status and metrics
  static getAutoscalingStatus(): {
    enabled: boolean;
    pools: WorkerPool[];
    recentDecisions: AutoscalingDecision[];
    totalInstances: number;
    estimatedMonthlyCost: number;
  } {
    const totalInstances = this.workerPools.reduce((sum, pool) => sum + pool.currentInstances, 0);
    const estimatedMonthlyCost = totalInstances * 50 * 24 * 30; // $50 per instance per hour

    return {
      enabled: this.isAutoscalingEnabled,
      pools: [...this.workerPools],
      recentDecisions: this.scalingHistory.slice(-20),
      totalInstances,
      estimatedMonthlyCost
    };
  }

  // Update pool configuration
  static updatePoolConfig(poolName: string, updates: Partial<WorkerPool>): boolean {
    const pool = this.workerPools.find(p => p.name === poolName);
    if (!pool) return false;

    Object.assign(pool, updates);
    console.log(`🔧 Updated pool ${poolName} configuration`);
    return true;
  }

  // Force scaling action (for manual intervention)
  static async forceScaling(poolName: string, targetInstances: number): Promise<boolean> {
    const pool = this.workerPools.find(p => p.name === poolName);
    if (!pool) return false;

    if (targetInstances < pool.minInstances || targetInstances > pool.maxInstances) {
      console.error(`Target instances ${targetInstances} outside allowed range [${pool.minInstances}, ${pool.maxInstances}]`);
      return false;
    }

    const decision: AutoscalingDecision = {
      poolName,
      action: targetInstances > pool.currentInstances ? 'scale_up' : 'scale_down',
      currentInstances: pool.currentInstances,
      targetInstances,
      reason: 'Manual scaling intervention',
      confidence: 100
    };

    await this.executeScalingAction(decision);
    return true;
  }
}
