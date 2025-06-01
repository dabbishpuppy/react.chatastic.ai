
import { useState, useEffect, useCallback } from 'react';
import { EnhancedCrawlService, EnhancedCrawlRequest, CrawlStatus } from '@/services/rag/enhancedCrawlService';
import { useToast } from '@/hooks/use-toast';

export const useEnhancedCrawl = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeCrawls, setActiveCrawls] = useState<Map<string, CrawlStatus>>(new Map());
  const { toast } = useToast();

  const initiateCrawl = useCallback(async (request: EnhancedCrawlRequest) => {
    setIsLoading(true);
    try {
      console.log('🚀 Starting enhanced crawl:', request);
      
      const result = await EnhancedCrawlService.initiateCrawl(request);
      
      // Set up real-time subscription for this crawl
      const unsubscribe = await EnhancedCrawlService.subscribeToCrawlUpdates(
        result.parentSourceId,
        (status) => {
          console.log('📡 Received crawl status update:', status);
          setActiveCrawls(prev => new Map(prev.set(result.parentSourceId, status)));
          
          // Show completion toast
          if (status.status === 'completed') {
            toast({
              title: "Crawl Completed",
              description: `Successfully crawled ${status.completedJobs} pages with ${status.failedJobs} failures. Compression ratio: ${(status.compressionStats?.avgCompressionRatio || 0).toFixed(2)}x`,
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

      // Store the unsubscribe function for cleanup
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
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const retryFailedJobs = useCallback(async (parentSourceId: string) => {
    try {
      const retriedCount = await EnhancedCrawlService.retryFailedJobs(parentSourceId);
      
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
      return await EnhancedCrawlService.getCrawlJobs(parentSourceId);
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
