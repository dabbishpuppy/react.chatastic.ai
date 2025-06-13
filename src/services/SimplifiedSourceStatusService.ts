
import { AgentSource } from '@/types/rag';

export interface ButtonState {
  showProgress?: boolean;
  canRecrawl: boolean;
  canTrain: boolean;
  canDelete: boolean;
}

export interface SourceStatusSummary {
  totalSources: number;
  hasCrawledSources: boolean;
  hasTrainingSources: boolean;
  allSourcesCompleted: boolean;
  isEmpty: boolean;
}

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

  static determineButtonState(source: AgentSource): ButtonState {
    const status = this.getSourceStatus(source);

    const baseState: ButtonState = {
      showProgress: false,
      canRecrawl: false,
      canTrain: false,
      canDelete: true
    };

    switch (status) {
      case 'pending':
        return {
          ...baseState,
          canRecrawl: true
        };
      case 'in_progress':
      case 'training':
        return {
          ...baseState,
          showProgress: true,
          canRecrawl: false,
          canTrain: false,
          canDelete: false
        };
      case 'crawled':
        return {
          ...baseState,
          canRecrawl: true,
          canTrain: true
        };
      case 'trained':
        return {
          ...baseState,
          canRecrawl: true,
          canTrain: false
        };
      case 'failed':
        return {
          ...baseState,
          canRecrawl: true
        };
      default:
        return baseState;
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

  static analyzeSourceStatus(sources: AgentSource[]): SourceStatusSummary {
    const totalSources = sources.length;
    const isEmpty = totalSources === 0;
    
    if (isEmpty) {
      return {
        totalSources: 0,
        hasCrawledSources: false,
        hasTrainingSources: false,
        allSourcesCompleted: false,
        isEmpty: true
      };
    }

    const statuses = sources.map(s => this.getSourceStatus(s));
    const hasCrawledSources = statuses.some(s => s === 'crawled' || s === 'trained');
    const hasTrainingSources = statuses.some(s => s === 'training');
    const allSourcesCompleted = statuses.every(s => s === 'crawled' || s === 'trained' || s === 'failed');
    
    return {
      totalSources,
      hasCrawledSources,
      hasTrainingSources,
      allSourcesCompleted,
      isEmpty: false
    };
  }

  static determineButtonState(summary: SourceStatusSummary): {
    showButton: boolean;
    buttonText: string;
    disabled: boolean;
    variant: 'default' | 'outline';
  } {
    if (summary.isEmpty) {
      return {
        showButton: true,
        buttonText: 'Retrain Agent',
        disabled: true,
        variant: 'outline'
      };
    }

    if (summary.hasTrainingSources) {
      return {
        showButton: true,
        buttonText: 'Training Agent...',
        disabled: true,
        variant: 'outline'
      };
    }

    return {
      showButton: true,
      buttonText: 'Retrain Agent',
      disabled: !summary.hasCrawledSources,
      variant: summary.hasCrawledSources ? 'default' : 'outline'
    };
  }
}
