
import { useState, useEffect } from 'react';
import { JobRecoveryServiceV2, type JobRecoveryStats } from '@/services/rag/enhanced/jobRecoveryServiceV2';

export const useJobMonitoring = (sourceId: string, enabled: boolean = true) => {
  const [jobStats, setJobStats] = useState<JobRecoveryStats>({
    totalJobs: 0,
    pendingJobs: 0,
    processingJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    stuckJobs: 0,
    recoveredJobs: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshStats = async () => {
    if (!enabled || !sourceId) return;
    
    setIsLoading(true);
    try {
      const stats = await JobRecoveryServiceV2.getJobStats(sourceId);
      setJobStats(stats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing job stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const recoverJobs = async () => {
    setIsLoading(true);
    try {
      const stats = await JobRecoveryServiceV2.performFullRecovery(sourceId);
      setJobStats(stats);
      setLastUpdated(new Date());
      return stats;
    } catch (error) {
      console.error('Error recovering jobs:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const triggerProcessing = async () => {
    setIsLoading(true);
    try {
      const success = await JobRecoveryServiceV2.triggerJobProcessing(sourceId);
      if (success) {
        // Refresh stats after a short delay
        setTimeout(refreshStats, 2000);
      }
      return success;
    } catch (error) {
      console.error('Error triggering processing:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(refreshStats, 30000);
    
    return () => clearInterval(interval);
  }, [sourceId, enabled]);

  const hasIssues = jobStats.pendingJobs > 0 || jobStats.stuckJobs > 0;
  const needsRecovery = jobStats.stuckJobs > 0;

  return {
    jobStats,
    isLoading,
    lastUpdated,
    hasIssues,
    needsRecovery,
    refreshStats,
    recoverJobs,
    triggerProcessing
  };
};
