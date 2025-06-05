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

  static startChunking(parentSourceId: string) {
    const { CrawlApiService } = await import('./enhanced/crawlApi');
    return CrawlApiService.startChunking(parentSourceId);
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
}
