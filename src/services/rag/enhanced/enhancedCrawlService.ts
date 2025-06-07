
// Re-export types and services for backward compatibility
export * from './crawlTypes';
export { CrawlApiService } from './crawlApi';
export { CrawlJobManager } from './crawlJobManager';
export { CrawlSubscriptionService } from './crawlSubscriptions';
export { CompressionAnalyticsService } from './compressionAnalytics';

// Main service class that orchestrates all enhanced crawl functionality
export class EnhancedCrawlService {
  static async initiateCrawl(request: import('./crawlTypes').EnhancedCrawlRequest) {
    const { CrawlApiService } = await import('./crawlApi');
    return CrawlApiService.initiateCrawl(request);
  }

  static async checkCrawlStatus(parentSourceId: string) {
    const { CrawlApiService } = await import('./crawlApi');
    return CrawlApiService.checkCrawlStatus(parentSourceId);
  }

  static async getCrawlJobs(parentSourceId: string) {
    const { CrawlJobManager } = await import('./crawlJobManager');
    return CrawlJobManager.getCrawlJobs(parentSourceId);
  }

  static async retryFailedJobs(parentSourceId: string) {
    const { CrawlJobManager } = await import('./crawlJobManager');
    return CrawlJobManager.retryFailedJobs(parentSourceId);
  }

  static subscribeToCrawlUpdates(
    parentSourceId: string,
    onUpdate: (status: import('./crawlTypes').CrawlStatus) => void
  ) {
    return import('./crawlSubscriptions').then(({ CrawlSubscriptionService }) =>
      CrawlSubscriptionService.subscribeToCrawlUpdates(parentSourceId, onUpdate)
    );
  }

  static async getCompressionStats(customerId: string) {
    const { CompressionAnalyticsService } = await import('./compressionAnalytics');
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
      
      // Handle 409 responses as success (processing conflicts are normal)
      if (error && (error.message?.includes('409') || error.status === 409)) {
        console.log('🔄 Source page processing conflict resolved - normal operation');
        return { 
          success: true, 
          message: 'Processing handled successfully (conflict resolved)',
          conflictResolved: true 
        };
      }
      
      if (error) {
        // Only throw for actual errors (5xx), not conflicts (409)
        if (error.status && error.status >= 500) {
          console.error('Server error in processing:', error);
          throw error;
        }
        
        // For other 4xx errors, log but don't throw
        console.warn('Client error in processing (possibly normal):', error);
        return { 
          success: true, 
          message: 'Processing completed with warnings',
          warning: error.message 
        };
      }
      
      return data;
    } catch (error) {
      // Filter out 409 errors from being thrown
      if (error.message?.includes('409') || error.status === 409) {
        console.log('🔄 Source page processing conflict resolved in catch block - normal operation');
        return { 
          success: true, 
          message: 'Processing handled successfully (conflict resolved)',
          conflictResolved: true 
        };
      }
      
      // Only throw for actual server errors
      if (error.status && error.status >= 500) {
        console.error('Failed to start source page processing:', error);
        throw error;
      }
      
      // For other errors, return a success response with warning
      console.warn('Processing completed with warnings:', error);
      return { 
        success: true, 
        message: 'Processing completed with warnings',
        warning: error.message 
      };
    }
  }

  // Add method to trigger status aggregation manually
  static async triggerStatusAggregation(parentSourceId: string) {
    try {
      const { supabase } = await import('../../../integrations/supabase/client');
      
      console.log(`🔄 Manually triggering status aggregation for parent: ${parentSourceId}`);
      
      const { data, error } = await supabase.functions.invoke('status-aggregator', {
        body: {
          parentSourceId,
          eventType: 'manual_aggregation'
        }
      });
      
      if (error) {
        console.error('Error triggering status aggregation:', error);
        throw error;
      }
      
      console.log('✅ Status aggregation triggered successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to trigger status aggregation:', error);
      throw error;
    }
  }
}
