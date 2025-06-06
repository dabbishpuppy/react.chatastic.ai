
import { useState } from 'react';

// Mock hook since enhanced crawl functionality was removed
export const useEnhancedCrawl = () => {
  const [isLoading, setIsLoading] = useState(false);

  const initiateCrawl = async (request: any) => {
    console.log('Enhanced crawl functionality has been removed');
    throw new Error('Enhanced crawl functionality has been removed');
  };

  const getActiveCrawlStatus = (parentSourceId: string) => {
    return null; // No active crawls since functionality was removed
  };

  const retryFailedJobs = async (parentSourceId: string) => {
    console.log('Enhanced crawl functionality has been removed');
    throw new Error('Enhanced crawl functionality has been removed');
  };

  const getCrawlJobs = async (parentSourceId: string) => {
    return []; // No jobs since functionality was removed
  };

  return {
    initiateCrawl,
    getActiveCrawlStatus,
    retryFailedJobs,
    getCrawlJobs,
    isLoading,
    // Add loading alias for backward compatibility
    loading: isLoading
  };
};
