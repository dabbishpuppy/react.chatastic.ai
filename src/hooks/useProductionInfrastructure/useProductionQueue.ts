
import { useState, useEffect, useCallback } from 'react';
import { ProductionWorkerQueue, QueueStats, WorkerJob } from '@/services/rag/enhanced/productionWorkerQueue';
import { RealRateLimitingService, RateLimitResult } from '@/services/rag/enhanced/realRateLimitingService';

interface UseProductionQueueResult {
  queueStats: QueueStats | null;
  rateLimitStats: {
    totalCustomers: number;
    activeRequests: number;
    throttledRequests: number;
    avgResponseTime: number;
  } | null;
  jobs: WorkerJob[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  enqueueJob: (
    type: string,
    payload: Record<string, any>,
    options: {
      priority?: number;
      customerId: string;
      sourceId?: string;
    }
  ) => Promise<string | null>;
  
  cancelJobs: (criteria: {
    jobType?: string;
    customerId?: string;
    sourceId?: string;
  }) => Promise<number>;
  
  checkRateLimit: (customerId: string) => Promise<RateLimitResult | null>;
  resetCustomerLimits: (customerId: string) => Promise<boolean>;
  cleanupOldJobs: (olderThanDays?: number) => Promise<number>;
  refreshStats: () => Promise<void>;
}

export const useProductionQueue = (
  jobType?: string,
  autoRefresh: boolean = true
): UseProductionQueueResult => {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [rateLimitStats, setRateLimitStats] = useState<{
    totalCustomers: number;
    activeRequests: number;
    throttledRequests: number;
    avgResponseTime: number;
  } | null>(null);
  const [jobs, setJobs] = useState<WorkerJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      setError(null);
      
      // Get queue statistics
      const queueStatsResult = await ProductionWorkerQueue.getQueueStats(jobType);
      setQueueStats(queueStatsResult);

      // Get rate limiting statistics
      const rateLimitStatsResult = await RealRateLimitingService.getRateLimitStats();
      setRateLimitStats(rateLimitStatsResult);

      // Get recent jobs if job type is specified
      if (jobType) {
        const recentJobs = await ProductionWorkerQueue.getNextJobs(jobType, 50);
        setJobs(recentJobs);
      }

    } catch (err) {
      console.error('Failed to refresh production queue stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh stats');
    } finally {
      setIsLoading(false);
    }
  }, [jobType]);

  // Auto-refresh functionality
  useEffect(() => {
    refreshStats();

    if (autoRefresh) {
      const interval = setInterval(refreshStats, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [refreshStats, autoRefresh]);

  const enqueueJob = useCallback(async (
    type: string,
    payload: Record<string, any>,
    options: {
      priority?: number;
      customerId: string;
      sourceId?: string;
    }
  ): Promise<string | null> => {
    try {
      setError(null);
      
      const jobId = await ProductionWorkerQueue.enqueueJob(type, payload, options);
      
      // Refresh stats after enqueuing
      setTimeout(refreshStats, 1000);
      
      return jobId;
    } catch (err) {
      console.error('Failed to enqueue job:', err);
      setError(err instanceof Error ? err.message : 'Failed to enqueue job');
      return null;
    }
  }, [refreshStats]);

  const cancelJobs = useCallback(async (criteria: {
    jobType?: string;
    customerId?: string;
    sourceId?: string;
  }): Promise<number> => {
    try {
      setError(null);
      
      const cancelledCount = await ProductionWorkerQueue.cancelJobs(criteria);
      
      // Refresh stats after cancellation
      setTimeout(refreshStats, 1000);
      
      return cancelledCount;
    } catch (err) {
      console.error('Failed to cancel jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel jobs');
      return 0;
    }
  }, [refreshStats]);

  const checkRateLimit = useCallback(async (customerId: string): Promise<RateLimitResult | null> => {
    try {
      setError(null);
      return await RealRateLimitingService.checkRateLimit(customerId);
    } catch (err) {
      console.error('Failed to check rate limit:', err);
      setError(err instanceof Error ? err.message : 'Failed to check rate limit');
      return null;
    }
  }, []);

  const resetCustomerLimits = useCallback(async (customerId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await RealRateLimitingService.resetCustomerLimits(customerId);
      
      if (success) {
        // Refresh stats after reset
        setTimeout(refreshStats, 1000);
      }
      
      return success;
    } catch (err) {
      console.error('Failed to reset customer limits:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset customer limits');
      return false;
    }
  }, [refreshStats]);

  const cleanupOldJobs = useCallback(async (olderThanDays: number = 7): Promise<number> => {
    try {
      setError(null);
      
      const cleanedCount = await ProductionWorkerQueue.cleanupOldJobs(olderThanDays);
      
      // Refresh stats after cleanup
      setTimeout(refreshStats, 1000);
      
      return cleanedCount;
    } catch (err) {
      console.error('Failed to cleanup old jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to cleanup old jobs');
      return 0;
    }
  }, [refreshStats]);

  return {
    queueStats,
    rateLimitStats,
    jobs,
    isLoading,
    error,
    enqueueJob,
    cancelJobs,
    checkRateLimit,
    resetCustomerLimits,
    cleanupOldJobs,
    refreshStats
  };
};
