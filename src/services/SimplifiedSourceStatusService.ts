
import { AgentSource } from '@/types/rag';

export class SimplifiedSourceStatusService {
  static getSourceStatus(source: AgentSource): string {
    // Handle workflow-enabled sources
    if (source.workflow_status) {
      return this.mapWorkflowStatus(source.workflow_status);
    }

    // Handle legacy crawl_status
    if (source.crawl_status) {
      return this.mapCrawlStatus(source.crawl_status, source);
    }

    // Default fallback
    return 'pending';
  }

  private static mapWorkflowStatus(workflowStatus: string): string {
    switch (workflowStatus) {
      case 'CREATED':
        return 'pending';
      case 'CRAWLING':
        return 'in_progress';
      case 'COMPLETED':
        return 'crawled';
      case 'TRAINING':
        return 'training';
      case 'TRAINED':
        return 'trained';
      case 'ERROR':
        return 'failed';
      case 'PENDING_REMOVAL':
        return 'pending_removal';
      case 'REMOVED':
        return 'removed';
      default:
        return workflowStatus.toLowerCase();
    }
  }

  private static mapCrawlStatus(crawlStatus: string, source: AgentSource): string {
    switch (crawlStatus) {
      case 'pending':
        return 'pending';
      case 'in_progress':
        // Check if we have child pages to determine actual progress
        if (source.total_jobs > 0 || source.total_children > 0) {
          return 'in_progress';
        }
        return 'pending';
      case 'crawled':
      case 'completed':
        return 'crawled';
      case 'training':
        return 'training';
      case 'trained':
        return 'trained';
      case 'failed':
      case 'error':
        return 'failed';
      case 'recrawling':
        return 'recrawling';
      default:
        return crawlStatus;
    }
  }

  static determineButtonState(source: AgentSource): 'crawl' | 'train' | 'recrawl' | 'disabled' {
    const status = this.getSourceStatus(source);

    switch (status) {
      case 'pending':
        return 'crawl';
      case 'in_progress':
      case 'training':
        return 'disabled';
      case 'crawled':
        return 'train';
      case 'trained':
        return 'recrawl';
      case 'failed':
        return 'recrawl';
      default:
        return 'crawl';
    }
  }

  static getStatusMessage(source: AgentSource): string {
    const status = this.getSourceStatus(source);
    
    switch (status) {
      case 'pending':
        return 'Ready to crawl';
      case 'in_progress':
        if (source.progress && source.progress > 0) {
          return `Crawling... ${source.progress}%`;
        }
        return 'Discovering pages...';
      case 'crawled':
        return `Crawled ${source.total_jobs || 0} pages`;
      case 'training':
        return 'Training in progress...';
      case 'trained':
        return 'Ready for chat';
      case 'failed':
        return 'Crawl failed';
      case 'recrawling':
        return 'Recrawling...';
      default:
        return status;
    }
  }
}
