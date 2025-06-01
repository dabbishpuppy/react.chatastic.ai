
import { useState, useCallback } from 'react';
import { toast } from "@/hooks/use-toast";

export const useCrawlTracking = (refetch: () => void) => {
  const [trackingCrawlId, setTrackingCrawlId] = useState<string | null>(null);

  const handleCrawlStarted = useCallback((parentSourceId: string) => {
    setTrackingCrawlId(parentSourceId);
    refetch();
    
    toast({
      title: "Enhanced Crawl Started",
      description: "Your crawl has been initiated with production worker queue and rate limiting",
    });
  }, [refetch]);

  const hideCrawlTracker = useCallback(() => {
    setTrackingCrawlId(null);
  }, []);

  return {
    trackingCrawlId,
    handleCrawlStarted,
    hideCrawlTracker
  };
};
