import { useState, useEffect, useCallback } from 'react';
import { 
  ProductionInfrastructureService, 
  ProductionWorkerQueue, 
  MonitoringAndAlertingService,
  AutoscalingService 
} from '@/services/rag/enhanced';
import { useToast } from '@/hooks/use-toast';

export const useProductionInfrastructure = () => {
  const [infrastructureHealth, setInfrastructureHealth] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [autoscalingStatus, setAutoscalingStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load infrastructure health with proper error handling
  const loadInfrastructureHealth = useCallback(async () => {
    try {
      setLoading(true);
      const health = await ProductionInfrastructureService.getInfrastructureHealth();
      
      // Ensure health percentage is a valid number
      if (health && typeof health === 'object') {
        const healthPercentage = health.healthPercentage || health.health || 0;
        const validatedHealth = {
          ...health,
          healthPercentage: isNaN(healthPercentage) ? 0 : Math.max(0, Math.min(100, healthPercentage)),
          healthy: healthPercentage >= 70,
          queueDepth: health.queueDepth || 0,
          activeWorkers: health.activeWorkers || 0,
          errorRate: isNaN(health.errorRate) ? 0 : health.errorRate
        };
        
        console.log('📊 Infrastructure health:', `${validatedHealth.healthPercentage}%`, validatedHealth.healthy ? '(healthy)' : '(critical)');
        setInfrastructureHealth(validatedHealth);
      } else {
        // Fallback health data
        const fallbackHealth = {
          healthPercentage: 0,
          healthy: false,
          queueDepth: 0,
          activeWorkers: 0,
          errorRate: 0,
          status: 'unavailable'
        };
        console.log('📊 Infrastructure health: 0% (unavailable - using fallback)');
        setInfrastructureHealth(fallbackHealth);
      }
    } catch (error) {
      console.error('Failed to load infrastructure health:', error);
      
      // Set fallback health data on error
      const fallbackHealth = {
        healthPercentage: 0,
        healthy: false,
        queueDepth: 0,
        activeWorkers: 0,
        errorRate: 1.0,
        status: 'error'
      };
      setInfrastructureHealth(fallbackHealth);
      
      toast({
        title: "Warning",
        description: "Infrastructure health monitoring unavailable",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load system health summary with error handling
  const loadSystemHealth = useCallback(async () => {
    try {
      const health = await MonitoringAndAlertingService.getSystemHealthSummary();
      
      if (health && typeof health === 'object') {
        // Validate numeric values
        const validatedSystemHealth = {
          ...health,
          cpuUsage: isNaN(health.cpuUsage) ? 0 : Math.max(0, Math.min(100, health.cpuUsage)),
          memoryUsage: isNaN(health.memoryUsage) ? 0 : Math.max(0, Math.min(100, health.memoryUsage)),
          responseTime: isNaN(health.responseTime) ? 0 : Math.max(0, health.responseTime)
        };
        setSystemHealth(validatedSystemHealth);
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
      setSystemHealth({
        cpuUsage: 0,
        memoryUsage: 0,
        responseTime: 0,
        status: 'unavailable'
      });
    }
  }, []);

  // Load autoscaling status with error handling
  const loadAutoscalingStatus = useCallback(async () => {
    try {
      const status = await AutoscalingService.getAutoscalingStatus();
      
      if (status && typeof status === 'object') {
        const validatedStatus = {
          ...status,
          currentWorkers: isNaN(status.currentWorkers) ? 0 : Math.max(0, status.currentWorkers),
          targetWorkers: isNaN(status.targetWorkers) ? 0 : Math.max(0, status.targetWorkers),
          scalingActivity: status.scalingActivity || false
        };
        setAutoscalingStatus(validatedStatus);
      }
    } catch (error) {
      console.error('Failed to load autoscaling status:', error);
      setAutoscalingStatus({
        currentWorkers: 0,
        targetWorkers: 0,
        scalingActivity: false,
        status: 'unavailable'
      });
    }
  }, []);

  // Optimize infrastructure
  const optimizeInfrastructure = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ProductionInfrastructureService.optimizeInfrastructure();
      
      toast({
        title: "Infrastructure Optimized",
        description: `Applied ${result.optimizations.length} optimizations. Expected improvement: ${result.expectedImprovementPercent}%`,
      });
      
      // Reload health after optimization
      await loadInfrastructureHealth();
      return result;
    } catch (error) {
      console.error('Failed to optimize infrastructure:', error);
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadInfrastructureHealth, toast]);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    try {
      await MonitoringAndAlertingService.startMonitoring();
      toast({
        title: "Monitoring Started",
        description: "Production monitoring and alerting is now active",
      });
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      toast({
        title: "Failed to Start Monitoring",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Start autoscaling
  const startAutoscaling = useCallback(async () => {
    try {
      await AutoscalingService.startAutoscaling();
      toast({
        title: "Autoscaling Started",
        description: "Production autoscaling is now active",
      });
      await loadAutoscalingStatus();
    } catch (error) {
      console.error('Failed to start autoscaling:', error);
      toast({
        title: "Failed to Start Autoscaling",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  }, [loadAutoscalingStatus, toast]);

  // Manual scale workers
  const manualScale = useCallback(async (targetWorkers: number) => {
    try {
      const success = await AutoscalingService.manualScale(targetWorkers, 'Manual scaling from UI');
      if (success) {
        toast({
          title: "Scaling Initiated",
          description: `Scaling to ${targetWorkers} workers`,
        });
        await loadAutoscalingStatus();
      }
    } catch (error) {
      console.error('Failed to scale workers:', error);
      toast({
        title: "Scaling Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  }, [loadAutoscalingStatus, toast]);

  // Get queue metrics
  const getQueueMetrics = useCallback(async () => {
    try {
      return await ProductionWorkerQueue.getQueueMetrics();
    } catch (error) {
      console.error('Failed to get queue metrics:', error);
      return null;
    }
  }, []);

  // Set up periodic updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadInfrastructureHealth();
      loadSystemHealth();
      loadAutoscalingStatus();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [loadInfrastructureHealth, loadSystemHealth, loadAutoscalingStatus]);

  // Initial load
  useEffect(() => {
    loadInfrastructureHealth();
    loadSystemHealth();
    loadAutoscalingStatus();
  }, [loadInfrastructureHealth, loadSystemHealth, loadAutoscalingStatus]);

  return {
    infrastructureHealth,
    systemHealth,
    autoscalingStatus,
    loading,
    optimizeInfrastructure,
    startMonitoring,
    startAutoscaling,
    manualScale,
    getQueueMetrics,
    loadInfrastructureHealth,
    loadSystemHealth,
    loadAutoscalingStatus
  };
};
