
// Re-export types and services for backward compatibility
export * from './enhanced/crawlTypes';
export { CrawlApiService } from './enhanced/crawlApi';
export { CrawlJobManager } from './enhanced/crawlJobManager';
export { CrawlSubscriptionService } from './enhanced/crawlSubscriptions';
export { CompressionAnalyticsService } from './enhanced/compressionAnalytics';

// Main service class that orchestrates all enhanced crawl functionality
export class EnhancedCrawlService {
  static async initiateCrawl(request: import('./enhanced/crawlTypes').EnhancedCrawlRequest) {
    const { CrawlApiService } = await import('./enhanced/crawlApi');
    return CrawlApiService.initiateCrawl(request);
  }

  static async checkCrawlStatus(parentSourceId: string) {
    const { CrawlApiService } = await import('./enhanced/crawlApi');
    return CrawlApiService.checkCrawlStatus(parentSourceId);
  }

  static async getCrawlJobs(parentSourceId: string) {
    const { CrawlJobManager } = await import('./enhanced/crawlJobManager');
    return CrawlJobManager.getCrawlJobs(parentSourceId);
  }

  static async retryFailedJobs(parentSourceId: string) {
    const { CrawlJobManager } = await import('./enhanced/crawlJobManager');
    return CrawlJobManager.retryFailedJobs(parentSourceId);
  }

  static subscribeToCrawlUpdates(
    parentSourceId: string,
    onUpdate: (status: import('./enhanced/crawlTypes').CrawlStatus) => void
  ) {
    return import('./enhanced/crawlSubscriptions').then(({ CrawlSubscriptionService }) =>
      CrawlSubscriptionService.subscribeToCrawlUpdates(parentSourceId, onUpdate)
    );
  }

  static async getCompressionStats(customerId: string) {
    const { CompressionAnalyticsService } = await import('./enhanced/compressionAnalytics');
    return CompressionAnalyticsService.getCompressionStats(customerId);
  }

  // Add the missing functions that are being called
  static async discoverLinks(url: string, excludePaths: string[] = [], includePaths: string[] = [], maxPages: number = 100) {
    try {
      // Use the edge function for link discovery to avoid CORS issues
      const { supabase } = await import('../../../integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          url,
          agentId: 'temp', // This will be overridden by the actual caller
          crawlMode: 'full-website',
          maxPages,
          excludePaths,
          includePaths,
          discoverOnly: true // Add flag to only discover, not process
        }
      });

      if (error) {
        console.error('Link discovery error:', error);
        return [url]; // Fallback to single URL
      }

      return data?.urls || [url];
    } catch (error) {
      console.error('Link discovery failed:', error);
      return [url]; // Fallback to single URL
    }
  }

  static async startSourcePageProcessing() {
    try {
      const { supabase } = await import('../../../integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('process-source-pages');
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to start source page processing:', error);
      throw error;
    }
  }
}
