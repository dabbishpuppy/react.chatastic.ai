import { supabase } from "@/integrations/supabase/client";
import { ProductionWorkerQueue } from './productionWorkerQueue';
import { MonitoringAndAlertingService } from './monitoringAndAlerting';

export interface AutoscalingMetrics {
  currentWorkers: number;
  targetWorkers: number;
  queueDepth: number;
  avgProcessingTime: number;
  cpuUtilization: number;
  memoryUtilization: number;
  lastScaleAction: string;
  lastScaleTime: string;
}

export interface ScalingRule {
  id: string;
  metric: 'queue_depth' | 'cpu_utilization' | 'memory_utilization' | 'error_rate';
  threshold: number;
  action: 'scale_up' | 'scale_down';
  cooldownMinutes: number;
  minWorkers: number;
  maxWorkers: number;
}

export class AutoscalingService {
  private static isAutoscalingActive = false;
  private static currentWorkerCount = 2; // Start with 2 workers
  private static lastScaleAction: string = 'initial';
  private static lastScaleTime = new Date().toISOString();
  private static scalingEvents: Array<{
    action: string;
    fromWorkers: number;
    toWorkers: number;
    reason: string;
    timestamp: string;
  }> = [];
  
  private static readonly DEFAULT_SCALING_RULES: ScalingRule[] = [
    {
      id: 'queue-depth-scale-up',
      metric: 'queue_depth',
      threshold: 100, // Scale up if more than 100 jobs queued
      action: 'scale_up',
      cooldownMinutes: 5,
      minWorkers: 2,
      maxWorkers: 50
    },
    {
      id: 'queue-depth-scale-down',
      metric: 'queue_depth',
      threshold: 10, // Scale down if less than 10 jobs queued
      action: 'scale_down',
      cooldownMinutes: 10,
      minWorkers: 2,
      maxWorkers: 50
    },
    {
      id: 'cpu-scale-up',
      metric: 'cpu_utilization',
      threshold: 70, // Scale up if CPU > 70%
      action: 'scale_up',
      cooldownMinutes: 3,
      minWorkers: 2,
      maxWorkers: 50
    },
    {
      id: 'cpu-scale-down',
      metric: 'cpu_utilization',
      threshold: 20, // Scale down if CPU < 20%
      action: 'scale_down',
      cooldownMinutes: 15,
      minWorkers: 2,
      maxWorkers: 50
    }
  ];

  // Start autoscaling system
  static async startAutoscaling(): Promise<void> {
    if (this.isAutoscalingActive) {
      console.log('Autoscaling already active');
      return;
    }

    this.isAutoscalingActive = true;
    console.log('🔄 Starting production autoscaling service');

    // Run autoscaling decisions every 2 minutes
    setInterval(async () => {
      try {
        await this.evaluateScalingDecisions();
      } catch (error) {
        console.error('Error in autoscaling evaluation:', error);
      }
    }, 120000); // 2 minutes

    // Monitor queue depth more frequently for burst scaling
    setInterval(async () => {
      try {
        await this.evaluateBurstScaling();
      } catch (error) {
        console.error('Error in burst scaling evaluation:', error);
      }
    }, 30000); // 30 seconds

    console.log('✅ Autoscaling service initialized');
  }

  // Evaluate scaling decisions based on metrics
  private static async evaluateScalingDecisions(): Promise<void> {
    try {
      const metrics = await this.collectAutoscalingMetrics();
      const scalingDecision = this.calculateScalingDecision(metrics);

      if (scalingDecision.shouldScale) {
        await this.executeScalingAction(scalingDecision.action, scalingDecision.targetWorkers, scalingDecision.reason);
      }

      // Log current status
      console.log(`📊 Autoscaling status: ${this.currentWorkerCount} workers, queue: ${metrics.queueDepth}, CPU: ${metrics.cpuUtilization}%`);

    } catch (error) {
      console.error('Failed to evaluate scaling decisions:', error);
    }
  }

  // Fast burst scaling for sudden queue growth
  private static async evaluateBurstScaling(): Promise<void> {
    try {
      const queueMetrics = await ProductionWorkerQueue.getQueueMetrics();
      
      // If queue depth suddenly spikes above 500, immediately add workers
      if (queueMetrics.queueDepth > 500 && this.currentWorkerCount < 20) {
        const targetWorkers = Math.min(20, this.currentWorkerCount + 5);
        await this.executeScalingAction('scale_up', targetWorkers, 'Burst scaling for queue spike');
      }

    } catch (error) {
      console.error('Failed to evaluate burst scaling:', error);
    }
  }

  // Collect metrics for autoscaling decisions
  private static async collectAutoscalingMetrics(): Promise<AutoscalingMetrics> {
    try {
      const queueMetrics = await ProductionWorkerQueue.getQueueMetrics();
      
      // Simulate CPU and memory metrics (in production, these would come from actual monitoring)
      const cpuUtilization = Math.min(100, (queueMetrics.workerUtilization * 100) + Math.random() * 20);
      const memoryUtilization = Math.min(100, cpuUtilization * 0.8 + Math.random() * 15);

      return {
        currentWorkers: this.currentWorkerCount,
        targetWorkers: this.currentWorkerCount,
        queueDepth: queueMetrics.queueDepth,
        avgProcessingTime: queueMetrics.averageProcessingTime,
        cpuUtilization,
        memoryUtilization,
        lastScaleAction: this.lastScaleAction,
        lastScaleTime: this.lastScaleTime
      };
    } catch (error) {
      console.error('Failed to collect autoscaling metrics:', error);
      return {
        currentWorkers: this.currentWorkerCount,
        targetWorkers: this.currentWorkerCount,
        queueDepth: 0,
        avgProcessingTime: 0,
        cpuUtilization: 0,
        memoryUtilization: 0,
        lastScaleAction: this.lastScaleAction,
        lastScaleTime: this.lastScaleTime
      };
    }
  }

  // Calculate if scaling is needed
  private static calculateScalingDecision(metrics: AutoscalingMetrics): {
    shouldScale: boolean;
    action: 'scale_up' | 'scale_down';
    targetWorkers: number;
    reason: string;
  } {
    const now = new Date();
    const lastScaleTime = new Date(this.lastScaleTime);
    const timeSinceLastScale = (now.getTime() - lastScaleTime.getTime()) / (1000 * 60); // minutes

    // Check each scaling rule
    for (const rule of this.DEFAULT_SCALING_RULES) {
      if (timeSinceLastScale < rule.cooldownMinutes) {
        continue; // Still in cooldown period
      }

      let currentValue = 0;
      switch (rule.metric) {
        case 'queue_depth':
          currentValue = metrics.queueDepth;
          break;
        case 'cpu_utilization':
          currentValue = metrics.cpuUtilization;
          break;
        case 'memory_utilization':
          currentValue = metrics.memoryUtilization;
          break;
      }

      const shouldTrigger = rule.action === 'scale_up' 
        ? currentValue > rule.threshold
        : currentValue < rule.threshold;

      if (shouldTrigger) {
        let targetWorkers = this.currentWorkerCount;
        
        if (rule.action === 'scale_up') {
          // Scale up by 25% or at least 2 workers
          const scaleAmount = Math.max(2, Math.ceil(this.currentWorkerCount * 0.25));
          targetWorkers = Math.min(rule.maxWorkers, this.currentWorkerCount + scaleAmount);
        } else {
          // Scale down by 20% or at least 1 worker
          const scaleAmount = Math.max(1, Math.ceil(this.currentWorkerCount * 0.2));
          targetWorkers = Math.max(rule.minWorkers, this.currentWorkerCount - scaleAmount);
        }

        if (targetWorkers !== this.currentWorkerCount) {
          return {
            shouldScale: true,
            action: rule.action,
            targetWorkers,
            reason: `${rule.metric} ${rule.action === 'scale_up' ? 'above' : 'below'} threshold (${currentValue} vs ${rule.threshold})`
          };
        }
      }
    }

    return { shouldScale: false, action: 'scale_up', targetWorkers: this.currentWorkerCount, reason: '' };
  }

  // Execute scaling action
  private static async executeScalingAction(action: 'scale_up' | 'scale_down', targetWorkers: number, reason: string): Promise<void> {
    try {
      console.log(`🔄 Autoscaling: ${action} from ${this.currentWorkerCount} to ${targetWorkers} workers. Reason: ${reason}`);

      // In production, this would actually scale the worker deployment
      // For now, we simulate the scaling action
      const fromWorkers = this.currentWorkerCount;
      this.currentWorkerCount = targetWorkers;
      this.lastScaleAction = `${action} to ${targetWorkers} workers`;
      this.lastScaleTime = new Date().toISOString();

      // Store scaling event in memory for analysis
      await this.recordScalingEvent(action, fromWorkers, targetWorkers, reason);

      // In real production environment, execute actual scaling:
      // - Kubernetes: kubectl scale deployment worker-deployment --replicas=${targetWorkers}
      // - AWS ECS: update service desired count
      // - Cloud Functions: adjust concurrency limits
      // - Docker Swarm: docker service scale worker=${targetWorkers}

      console.log(`✅ Scaling completed: now running ${this.currentWorkerCount} workers`);

    } catch (error) {
      console.error('Failed to execute scaling action:', error);
    }
  }

  // Record scaling events for analysis (in memory since table doesn't exist)
  private static async recordScalingEvent(action: string, fromWorkers: number, toWorkers: number, reason: string): Promise<void> {
    try {
      const event = {
        action,
        fromWorkers,
        toWorkers,
        reason,
        timestamp: new Date().toISOString()
      };
      
      this.scalingEvents.push(event);
      
      // Keep only last 100 events
      if (this.scalingEvents.length > 100) {
        this.scalingEvents = this.scalingEvents.slice(-100);
      }

      console.log(`📝 Recorded scaling event: ${action} from ${fromWorkers} to ${toWorkers} workers`);
    } catch (error) {
      console.error('Error recording scaling event:', error);
    }
  }

  // Get current autoscaling status
  static async getAutoscalingStatus(): Promise<{
    active: boolean;
    currentWorkers: number;
    metrics: AutoscalingMetrics;
    recentEvents: any[];
  }> {
    try {
      const metrics = await this.collectAutoscalingMetrics();
      
      return {
        active: this.isAutoscalingActive,
        currentWorkers: this.currentWorkerCount,
        metrics,
        recentEvents: this.scalingEvents.slice(-10)
      };
    } catch (error) {
      console.error('Failed to get autoscaling status:', error);
      return {
        active: this.isAutoscalingActive,
        currentWorkers: this.currentWorkerCount,
        metrics: await this.collectAutoscalingMetrics(),
        recentEvents: []
      };
    }
  }

  // Manual scaling override
  static async manualScale(targetWorkers: number, reason: string = 'Manual override'): Promise<boolean> {
    try {
      if (targetWorkers < 1 || targetWorkers > 100) {
        console.error('Invalid worker count for manual scaling:', targetWorkers);
        return false;
      }

      const action = targetWorkers > this.currentWorkerCount ? 'scale_up' : 'scale_down';
      await this.executeScalingAction(action, targetWorkers, reason);
      return true;
    } catch (error) {
      console.error('Manual scaling failed:', error);
      return false;
    }
  }

  // Stop autoscaling
  static stopAutoscaling(): void {
    this.isAutoscalingActive = false;
    console.log('🛑 Autoscaling service stopped');
  }
}
