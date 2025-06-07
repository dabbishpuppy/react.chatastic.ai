
export class SimplifiedSourceStatusService {
  static getSourceStatus(source: any): string {
    if (!source) return 'unknown';

    const metadata = source.metadata as any || {};
    const crawlStatus = source.crawl_status;
    
    // Check for training completion first
    if (metadata.training_completed_at || metadata.last_trained_at) {
      return 'trained';
    }
    
    // Check for training in progress
    if (metadata.training_status === 'in_progress' || crawlStatus === 'training') {
      return 'training';
    }
    
    // Check if ready for training (crawling completed)
    if (crawlStatus === 'completed' || crawlStatus === 'crawled') {
      return 'ready_for_training';
    }
    
    // Check for crawling in progress
    if (crawlStatus === 'in_progress') {
      return 'in_progress';
    }
    
    // Check for failed states
    if (crawlStatus === 'failed') {
      return 'failed';
    }
    
    // Check for excluded sources
    if (source.is_excluded) {
      return 'excluded';
    }
    
    // Default to pending
    return crawlStatus || 'pending';
  }

  static isTrainingCompleted(source: any): boolean {
    if (!source) return false;
    
    const metadata = source.metadata as any || {};
    return !!(metadata.training_completed_at || metadata.last_trained_at);
  }

  static shouldShowTrainedStatus(source: any): boolean {
    const status = this.getSourceStatus(source);
    return status === 'trained';
  }
}
