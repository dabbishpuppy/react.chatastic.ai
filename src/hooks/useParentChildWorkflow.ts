
import { useState, useEffect, useCallback } from 'react';
import { ParentChildWorkflowService, ParentChildStatus, ChildJob } from '@/services/rag/parentChildWorkflowService';
import { useToast } from '@/hooks/use-toast';

export const useParentChildWorkflow = (parentSourceId?: string) => {
  const [status, setStatus] = useState<ParentChildStatus | null>(null);
  const [childJobs, setChildJobs] = useState<ChildJob[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch parent-child status
  const fetchStatus = useCallback(async () => {
    if (!parentSourceId) return;

    try {
      setLoading(true);
      const parentStatus = await ParentChildWorkflowService.getParentChildStatus(parentSourceId);
      setStatus(parentStatus);
    } catch (error) {
      console.error('Error fetching parent-child status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch crawl status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [parentSourceId, toast]);

  // Fetch child jobs
  const fetchChildJobs = useCallback(async () => {
    if (!parentSourceId) return;

    try {
      const jobs = await ParentChildWorkflowService.getChildJobs(parentSourceId);
      setChildJobs(jobs);
    } catch (error) {
      console.error('Error fetching child jobs:', error);
    }
  }, [parentSourceId]);

  // Start link discovery
  const startLinkDiscovery = useCallback(async (params: {
    customerId: string;
    url: string;
    excludePaths?: string[];
    includePaths?: string[];
    maxPages?: number;
    priority?: string;
  }) => {
    if (!parentSourceId) return;

    try {
      setLoading(true);
      const result = await ParentChildWorkflowService.startLinkDiscovery({
        parentSourceId,
        ...params
      });

      toast({
        title: "Link Discovery Started",
        description: `Discovered ${result.discoveredCount} pages, spawned ${result.spawnedJobs} jobs`,
      });

      // Refresh status after discovery
      await fetchStatus();
      return result;
    } catch (error) {
      console.error('Error starting link discovery:', error);
      toast({
        title: "Discovery Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [parentSourceId, fetchStatus, toast]);

  // Retry failed jobs
  const retryFailedJobs = useCallback(async () => {
    if (!parentSourceId) return;

    try {
      const retriedCount = await ParentChildWorkflowService.retryFailedJobs(parentSourceId);
      
      toast({
        title: "Jobs Retried",
        description: `Retried ${retriedCount} failed jobs`,
      });
      
      await fetchStatus();
      await fetchChildJobs();
      return retriedCount;
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
      toast({
        title: "Retry Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      throw error;
    }
  }, [parentSourceId, fetchStatus, fetchChildJobs, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!parentSourceId) return;

    console.log(`📡 Setting up real-time subscription for parent: ${parentSourceId}`);

    const unsubscribe = ParentChildWorkflowService.subscribeToParentChildUpdates(
      parentSourceId,
      (updatedStatus) => {
        console.log('📊 Received real-time status update:', updatedStatus);
        setStatus(updatedStatus);
        
        // Refresh child jobs when status changes
        fetchChildJobs();
      }
    );

    return unsubscribe;
  }, [parentSourceId, fetchChildJobs]);

  // Initial load
  useEffect(() => {
    if (parentSourceId) {
      fetchStatus();
      fetchChildJobs();
    }
  }, [parentSourceId, fetchStatus, fetchChildJobs]);

  return {
    status,
    childJobs,
    loading,
    startLinkDiscovery,
    retryFailedJobs,
    fetchStatus,
    fetchChildJobs
  };
};
