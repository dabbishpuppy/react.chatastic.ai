
import { useCallback } from 'react';
import { ProductionWorkerQueue } from '@/services/rag/enhanced';

export const useQueueOperations = () => {
  const getQueueMetrics = useCallback(async () => {
    try {
      return await ProductionWorkerQueue.getQueueMetrics();
    } catch (error) {
      console.error('Failed to get queue metrics:', error);
      return null;
    }
  }, []);

  return {
    getQueueMetrics
  };
};
