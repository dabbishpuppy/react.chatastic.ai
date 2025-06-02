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
        // Access the correct properties from InfrastructureHealth interface
        const healthScore = health.overall?.healthScore || 0;
        const validatedHealth = {
          ...health,
          healthPercentage: isNaN(healthScore) ? 0 : Math.max(0, Math.min(100, healthScore)),
          healthy: healthScore >= 70,
          queueDepth: health.connectionPools?.queuedRequests || 0,
          activeWorkers: health.connectionPools?.activeConnections || 0,
          errorRate: isNaN(health.rateLimiting?.throttledRequests || 0) ? 0 : (health.rateLimiting?.throttledRequests || 0) / 100
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
        // Validate numeric values from the correct SystemMetrics structure with proper null checks
        const metrics = (health as any).metrics;
        const validatedSystemHealth = {
          ...health,
          cpuUsage: typeof metrics?.cpuUsage === 'number' && !isNaN(metrics.cpuUsage) ? Math.max(0, Math.min(100, metrics.cpuUsage)) : 0,
          memoryUsage: typeof metrics?.memoryUsage === 'number' && !isNaN(metrics.memoryUsage) ? Math.max(0, Math.min(100, metrics.memoryUsage)) : 0,
          responseTime: typeof metrics?.responseTime === 'number' && !isNaN(metrics.responseTime) ? Math.max(0, metrics.responseTime) : 0
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
        // Access the correct properties from autoscaling status with proper null checks
        const metrics = (status as any).metrics;
        const validatedStatus = {
          ...status,
          currentWorkers: typeof (status as any).currentWorkers === 'number' && !isNaN((status as any).currentWorkers) ? Math.max(0, (status as any).currentWorkers) : 0,
          targetWorkers: typeof metrics?.targetWorkers === 'number' && !isNaN(metrics.targetWorkers) ? Math.max(0, metrics.targetWorkers) : 0,
          scalingActivity: Boolean((status as any).active)
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
