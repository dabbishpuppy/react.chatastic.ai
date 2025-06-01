import { useState, useCallback } from 'react';
import { CrawlApiService } from '@/services/rag/enhanced/crawlApi';
import { CrawlSubscriptionService } from '@/services/rag/enhanced/crawlSubscriptions';
import { EnhancedCrawlRequest, CrawlStatus } from '@/services/rag/enhanced/crawlTypes';
import { useToast } from '@/hooks/use-toast';

export const useEnhancedCrawl = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeCrawls, setActiveCrawls] = useState<Map<string, CrawlStatus>>(new Map());
  const { toast } = useToast();

  const initiateCrawl = useCallback(async (request: EnhancedCrawlRequest) => {
    setIsLoading(true);
    try {
      console.log('🚀 Starting enhanced crawl:', request);
      
      // Validate request before sending
      if (!request.agentId) {
        throw new Error('Agent ID is required');
      }
      if (!request.url || !request.url.trim()) {
        throw new Error('URL is required');
      }

      const result = await CrawlApiService.initiateCrawl(request);
      
      // Set up real-time subscription for this crawl
      const unsubscribe = CrawlSubscriptionService.subscribeToCrawlUpdates(
        result.parentSourceId,
        (status) => {
          console.log('📡 Received crawl status update:', status);
          setActiveCrawls(prev => new Map(prev.set(result.parentSourceId, status)));
          
          // Show completion toast
          if (status.status === 'completed') {
            toast({
              title: "Crawl Completed",
              description: `Successfully crawled ${status.completedJobs} pages with ${status.failedJobs} failures.`,
            });
            
            // Clean up subscription after completion
            setTimeout(() => {
              unsubscribe();
              setActiveCrawls(prev => {
                const newMap = new Map(prev);
                newMap.delete(result.parentSourceId);
                return newMap;
              });
            }, 5000);
          } else if (status.status === 'failed') {
            toast({
              title: "Crawl Failed",
              description: "The crawl encountered an error. Please try again.",
              variant: "destructive",
            });
            unsubscribe();
          }
        }
      );

      // Store the initial status
      const initialStatus: CrawlStatus = {
        parentSourceId: result.parentSourceId,
        status: 'pending',
        progress: 0,
        totalJobs: result.totalJobs,
        completedJobs: 0,
        failedJobs: 0
      };
      
      setActiveCrawls(prev => new Map(prev.set(result.parentSourceId, initialStatus)));

      toast({
        title: "Crawl Initiated",
        description: `Starting crawl with ${result.totalJobs} pages discovered`,
      });

      return result;
      
    } catch (error: any) {
      console.error('Enhanced crawl error:', error);
      toast({
        title: "Crawl Error",
        description: error.message || "Failed to start crawl",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const retryFailedJobs = useCallback(async (parentSourceId: string) => {
    try {
      const retriedCount = await CrawlApiService.retryFailedJobs(parentSourceId);
      
      toast({
        title: "Jobs Retried",
        description: `Retrying ${retriedCount} failed jobs`,
      });
      
      return retriedCount;
    } catch (error: any) {
      toast({
        title: "Retry Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const getCrawlJobs = useCallback(async (parentSourceId: string) => {
    try {
      return await CrawlApiService.getCrawlJobs(parentSourceId);
    } catch (error: any) {
      toast({
        title: "Error Loading Jobs",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  return {
    initiateCrawl,
    retryFailedJobs,
    getCrawlJobs,
    isLoading,
    activeCrawls: Array.from(activeCrawls.values()),
    getActiveCrawlStatus: (parentSourceId: string) => activeCrawls.get(parentSourceId)
  };
};
