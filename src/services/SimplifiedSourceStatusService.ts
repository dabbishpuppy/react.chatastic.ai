
export interface SourceStatusSummary {
  totalSources: number;
  hasCrawledSources: boolean;
  hasTrainingSources: boolean;
  allSourcesCompleted: boolean;
  isEmpty: boolean;
}

export interface ButtonState {
  showButton: boolean;
  disabled: boolean;
  buttonText: string;
  variant: 'default' | 'outline' | 'secondary';
}

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

  static analyzeSourceStatus(sources: any[]): SourceStatusSummary {
    if (!sources || sources.length === 0) {
      return {
        totalSources: 0,
        hasCrawledSources: false,
        hasTrainingSources: false,
        allSourcesCompleted: false,
        isEmpty: true
      };
    }

    const totalSources = sources.length;
    const hasCrawledSources = sources.some(s => s.crawl_status === 'completed' || s.crawl_status === 'crawled');
    const hasTrainingSources = sources.some(s => s.requires_manual_training === true);
    const allSourcesCompleted = sources.every(s => s.crawl_status === 'completed' || s.crawl_status === 'crawled' || this.isTrainingCompleted(s));

    return {
      totalSources,
      hasCrawledSources,
      hasTrainingSources,
      allSourcesCompleted,
      isEmpty: false
    };
  }

  static determineButtonState(statusSummary: SourceStatusSummary): ButtonState {
    if (statusSummary.isEmpty) {
      return {
        showButton: false,
        disabled: true,
        buttonText: 'No Sources',
        variant: 'outline'
      };
    }

    if (statusSummary.hasTrainingSources) {
      return {
        showButton: true,
        disabled: false,
        buttonText: 'Train Agent',
        variant: 'default'
      };
    }

    if (statusSummary.allSourcesCompleted) {
      return {
        showButton: true,
        disabled: true,
        buttonText: 'Agent Trained',
        variant: 'outline'
      };
    }

    return {
      showButton: true,
      disabled: true,
      buttonText: 'Training Agent...',
      variant: 'outline'
    };
  }
}
