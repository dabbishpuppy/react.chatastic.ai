
export type SimpleSourceStatus = 'crawling' | 'completed' | 'training' | 'trained' | 'removed';

export interface SimpleStatusSummary {
  totalSources: number;
  canTrain: boolean;
  isTraining: boolean;
  isEmpty: boolean;
}

interface SourceMetadata {
  training_status?: string;
  training_completed_at?: string;
  training_started_at?: string;
  training_error?: string;
  last_trained_at?: string;
  [key: string]: any;
}

export class SimpleStatusService {
  static getSourceStatus(source: any): SimpleSourceStatus {
    // Check if marked for deletion (soft delete)
    if (source.pending_deletion === true) {
      return 'removed';
    }
    
    // Check if marked as excluded (legacy)
    if (source.is_excluded === true) {
      return 'removed';
    }
    
    // Check training status first
    const metadata = (source.metadata as SourceMetadata) || {};
    if (metadata.training_status === 'in_progress' || source.crawl_status === 'training') {
      return 'training';
    }
    
    if (metadata.training_completed_at || metadata.last_trained_at) {
      return 'trained';
    }
    
    // Check crawling status
    if (source.crawl_status === 'in_progress' || source.crawl_status === 'crawling') {
      return 'crawling';
    }
    
    if (source.crawl_status === 'ready_for_training' || source.crawl_status === 'completed') {
      return 'completed';
    }
    
    // Default to crawling for new sources
    return 'crawling';
  }

  static analyzeSourceStatus(sources: any[]): SimpleStatusSummary {
    // Filter out sources that are actually deleted (not just pending deletion)
    const activeSources = sources.filter(s => !s.is_excluded || s.pending_deletion);
    const totalSources = activeSources.length;
    const isEmpty = totalSources === 0;
    
    if (isEmpty) {
      return {
        totalSources: 0,
        canTrain: false,
        isTraining: false,
        isEmpty: true
      };
    }

    const statuses = activeSources.map(s => this.getSourceStatus(s));
    const hasCompleted = statuses.includes('completed');
    const hasPendingDeletion = activeSources.some(s => s.pending_deletion === true);
    const isTraining = statuses.includes('training');
    
    return {
      totalSources,
      canTrain: hasCompleted || hasPendingDeletion,
      isTraining,
      isEmpty: false
    };
  }

  static getButtonState(summary: SimpleStatusSummary): {
    showButton: boolean;
    buttonText: string;
    disabled: boolean;
    variant: 'default' | 'outline';
  } {
    // Always show the button
    if (summary.isEmpty) {
      return {
        showButton: true,
        buttonText: 'Retrain Agent',
        disabled: true,
        variant: 'outline'
      };
    }

    if (summary.isTraining) {
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
      disabled: !summary.canTrain,
      variant: summary.canTrain ? 'default' : 'outline'
    };
  }
}
