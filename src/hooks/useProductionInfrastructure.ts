
import { useEffect } from 'react';
import { useInfrastructureHealth } from './useProductionInfrastructure/useInfrastructureHealth';
import { useSystemHealth } from './useProductionInfrastructure/useSystemHealth';
import { useAutoscaling } from './useProductionInfrastructure/useAutoscaling';
import { useQueueOperations } from './useProductionInfrastructure/useQueueOperations';

export const useProductionInfrastructure = () => {
  const {
    infrastructureHealth,
    loading,
    loadInfrastructureHealth,
    optimizeInfrastructure
  } = useInfrastructureHealth();

  const {
    systemHealth,
    loadSystemHealth,
    startMonitoring
  } = useSystemHealth();

  const {
    autoscalingStatus,
    loadAutoscalingStatus,
    startAutoscaling,
    manualScale
  } = useAutoscaling();

  const { getQueueMetrics } = useQueueOperations();

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
