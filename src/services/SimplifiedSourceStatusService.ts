
export type SourceStatus = 'pending' | 'crawling' | 'crawled' | 'training' | 'completed';

export interface SourceStatusSummary {
  totalSources: number;
  hasCrawledSources: boolean;
  hasTrainingSources: boolean;
  allSourcesCompleted: boolean;
  isEmpty: boolean;
}

export class SimplifiedSourceStatusService {
  static analyzeSourceStatus(sources: any[]): SourceStatusSummary {
    const totalSources = sources.length;
    const isEmpty = totalSources === 0;
    
    const crawledSources = sources.filter(s => this.getSourceStatus(s) === 'crawled');
    const trainingSources = sources.filter(s => this.getSourceStatus(s) === 'training');
    const completedSources = sources.filter(s => this.getSourceStatus(s) === 'completed');
    
    return {
      totalSources,
      isEmpty,
      hasCrawledSources: crawledSources.length > 0,
      hasTrainingSources: trainingSources.length > 0,
      allSourcesCompleted: totalSources > 0 && completedSources.length === totalSources
    };
  }

  static getSourceStatus(source: any): SourceStatus {
    const metadata = source.metadata as Record<string, any> | null;
    
    // Check metadata for training status first
    if (metadata?.training_status === 'in_progress' || metadata?.training_started_at) {
      if (metadata?.training_completed_at) {
        return 'completed';
      }
      return 'training';
    }

    // For website sources, check crawl_status and child page processing status
    if (source.source_type === 'website') {
      // If crawl status is training, it's being trained
      if (source.crawl_status === 'training') {
        return 'training';
      }
      
      // If crawl is completed and requires manual training, it's ready for training
      if (source.crawl_status === 'completed' && source.requires_manual_training === true) {
        return 'crawled';
      }
      
      // If crawl is completed and training has been done, it's fully completed
      if (source.crawl_status === 'completed' && source.requires_manual_training === false) {
        return 'completed';
      }
      
      // If currently crawling
      if (source.crawl_status === 'in_progress') {
        return 'crawling';
      }
      
      // Default to pending
      return source.crawl_status || 'pending';
    }
    
    // For other sources, derive status from requires_manual_training and metadata
    if (source.requires_manual_training === true) {
      return 'crawled'; // Needs training
    }
    
    // Check if training was completed
    if (metadata?.training_completed_at) {
      return 'completed';
    }
    
    return 'completed'; // Already trained
  }

  static determineButtonState(summary: SourceStatusSummary): {
    showButton: boolean;
    buttonText: string;
    disabled: boolean;
    variant: 'default' | 'outline';
  } {
    if (summary.isEmpty) {
      return {
        showButton: false,
        buttonText: '',
        disabled: false,
        variant: 'default'
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

    if (summary.hasCrawledSources) {
      return {
        showButton: true,
        buttonText: 'Train Agent',
        disabled: false,
        variant: 'default'
      };
    }

    if (summary.allSourcesCompleted) {
      return {
        showButton: true,
        buttonText: 'Agent Trained',
        disabled: true,
        variant: 'outline'
      };
    }

    return {
      showButton: false,
      buttonText: '',
      disabled: false,
      variant: 'default'
    };
  }
}
