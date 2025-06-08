
// Enhanced crawl service with improved error handling and validation
export * from './crawlTypes';
export { ImprovedCrawlApiService as CrawlApiService } from './improvedCrawlApi';
export { CrawlJobManager } from './crawlJobManager';
export { CrawlSubscriptionService } from './crawlSubscriptions';
export { CompressionAnalyticsService } from './compressionAnalytics';
export { DatabaseCleanupService } from './databaseCleanupService';

// Main service class that orchestrates all enhanced crawl functionality with improved error handling
export class EnhancedCrawlServiceV2 {
  static async initiateCrawl(request: import('./crawlTypes').EnhancedCrawlRequest) {
    const { ImprovedCrawlApiService } = await import('./improvedCrawlApi');
    return ImprovedCrawlApiService.initiateCrawl(request);
  }

  static async checkCrawlStatus(parentSourceId: string) {
    const { ImprovedCrawlApiService } = await import('./improvedCrawlApi');
    return ImprovedCrawlApiService.checkCrawlStatus(parentSourceId);
  }

  static async getCrawlJobs(parentSourceId: string) {
    const { ImprovedCrawlApiService } = await import('./improvedCrawlApi');
    return ImprovedCrawlApiService.getCrawlJobs(parentSourceId);
  }

  static async retryFailedJobs(parentSourceId: string) {
    const { ImprovedCrawlApiService } = await import('./improvedCrawlApi');
    return ImprovedCrawlApiService.retryFailedJobs(parentSourceId);
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

  static async cleanupDatabase() {
    const { DatabaseCleanupService } = await import('./databaseCleanupService');
    return DatabaseCleanupService.cleanupOrphanedSourcePages();
  }

  static async getDatabaseHealth() {
    const { DatabaseCleanupService } = await import('./databaseCleanupService');
    return DatabaseCleanupService.getDatabaseHealth();
  }
}
