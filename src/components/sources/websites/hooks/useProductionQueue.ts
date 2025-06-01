
import { useState, useEffect, useCallback } from 'react';
import { ProductionWorkerQueue } from "@/services/rag/enhanced/productionWorkerQueue";

export const useProductionQueue = () => {
  const [queueMetrics, setQueueMetrics] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeQueue = useCallback(async () => {
    try {
      await ProductionWorkerQueue.startQueueProcessor();
      console.log('✅ Production worker queue initialized');
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Failed to initialize worker queue:', error);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const [metrics, health] = await Promise.all([
        ProductionWorkerQueue.getQueueMetrics(),
        ProductionWorkerQueue.getHealthStatus()
      ]);
      setQueueMetrics(metrics);
      setHealthStatus(health);
    } catch (error) {
      console.error('Error fetching queue metrics:', error);
    }
  }, []);

  useEffect(() => {
    initializeQueue();
    
    // Set up metrics polling
    const metricsInterval = setInterval(fetchMetrics, 10000);

    return () => {
      clearInterval(metricsInterval);
      ProductionWorkerQueue.stopQueueProcessor();
    };
  }, [initializeQueue, fetchMetrics]);

  return {
    queueMetrics,
    healthStatus,
    isInitialized,
    refreshMetrics: fetchMetrics
  };
};
