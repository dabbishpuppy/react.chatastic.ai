
import { useState, useEffect, useCallback } from 'react';
import { jobProcessorManager } from '@/services/workflow/processors/JobProcessorManager';

export const useJobProcessorManager = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [processorStatus, setProcessorStatus] = useState<Record<string, { isRunning: boolean }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update status
  const updateStatus = useCallback(() => {
    const managerStatus = jobProcessorManager.getManagerStatus();
    const status = jobProcessorManager.getStatus();
    
    setIsStarted(managerStatus.isStarted);
    setProcessorStatus(status);
  }, []);

  // Start all processors
  const startProcessors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await jobProcessorManager.startAll();
      updateStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start processors');
    } finally {
      setIsLoading(false);
    }
  }, [updateStatus]);

  // Stop all processors
  const stopProcessors = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    try {
      jobProcessorManager.stopAll();
      updateStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop processors');
    } finally {
      setIsLoading(false);
    }
  }, [updateStatus]);

  // Start specific processor
  const startProcessor = useCallback(async (jobType: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await jobProcessorManager.startProcessor(jobType);
      updateStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to start ${jobType} processor`);
    } finally {
      setIsLoading(false);
    }
  }, [updateStatus]);

  // Stop specific processor
  const stopProcessor = useCallback((jobType: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      jobProcessorManager.stopProcessor(jobType);
      updateStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to stop ${jobType} processor`);
    } finally {
      setIsLoading(false);
    }
  }, [updateStatus]);

  // Update status on mount and periodically
  useEffect(() => {
    updateStatus();
    
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateStatus]);

  return {
    isStarted,
    processorStatus,
    isLoading,
    error,
    startProcessors,
    stopProcessors,
    startProcessor,
    stopProcessor,
    updateStatus
  };
};
