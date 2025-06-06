
export type SourceStatus = 'pending' | 'crawling' | 'crawled' | 'training' | 'completed' | 'trained' | 'training_completed';

export interface SourceStatusSummary {
  totalSources: number;
  hasCrawledSources: boolean;
  hasTrainingSources: boolean;
  allSourcesCompleted: boolean;
  isEmpty: boolean;
}

interface SourceMetadata {
  training_status?: string;
  training_completed_at?: string;
  training_started_at?: string;
  last_trained_at?: string;
  children_training_completed?: boolean;
  [key: string]: any;
}

export class SimplifiedSourceStatusService {
  static analyzeSourceStatus(sources: any[]): SourceStatusSummary {
    const totalSources = sources.length;
    const isEmpty = totalSources === 0;
    
    const crawledSources = sources.filter(s => this.getSourceStatus(s) === 'crawled');
    const trainingSources = sources.filter(s => this.getSourceStatus(s) === 'training');
    const trainedSources = sources.filter(s => this.getSourceStatus(s) === 'trained');
    const completedSources = sources.filter(s => this.getSourceStatus(s) === 'completed' || this.getSourceStatus(s) === 'training_completed');
    
    return {
      totalSources,
      isEmpty,
      hasCrawledSources: crawledSources.length > 0,
      hasTrainingSources: trainingSources.length > 0,
      allSourcesCompleted: totalSources > 0 && (trainedSources.length + completedSources.length) === totalSources
    };
  }

  static getSourceStatus(source: any): SourceStatus {
    const metadata = (source.metadata as SourceMetadata) || {};
    
    console.log('SimplifiedSourceStatusService.getSourceStatus:', {
      sourceId: source.id,
      crawlStatus: source.crawl_status,
      requiresManualTraining: source.requires_manual_training,
      metadata: metadata,
      sourceType: source.source_type,
      parentSourceId: source.parent_source_id
    });
    
    // Check if currently training
    if (metadata.training_status === 'in_progress' || source.crawl_status === 'training') {
      return 'training';
    }
    
    // Check if training completed - FIXED: Distinguish between "trained" and "training_completed"
    if (metadata.training_completed_at || metadata.last_trained_at) {
      // For website sources, distinguish between parent and child completion
      if (source.source_type === 'website') {
        // For child sources, they're "trained" when training is done
        if (source.parent_source_id !== null) {
          return 'trained';
        }
        // For parent sources, they should show "training_completed" when training is done
        return 'training_completed';
      }
      return 'trained';
    }
    
    // For website sources, check crawl_status
    if (source.source_type === 'website') {
      // Handle "ready_for_training" status properly
      if ((source.crawl_status === 'ready_for_training' || source.crawl_status === 'completed') && source.requires_manual_training === true) {
        return 'crawled'; // Ready for training
      }
      
      // FIXED: For parent sources, if crawl is completed/ready_for_training and no manual training required,
      // but no training metadata exists yet, it should be "completed" (not yet trained)
      // Once training happens and metadata is added, it will become "training_completed"
      if ((source.crawl_status === 'ready_for_training' || source.crawl_status === 'completed') && source.requires_manual_training === false) {
        // If this is a parent source and has no training metadata, it's just "completed" (crawling done, not trained yet)
        if (source.parent_source_id === null && !metadata.training_completed_at && !metadata.last_trained_at) {
          return 'completed';
        }
        // If it has training metadata, it should be handled by the training completion logic above
        return 'completed';
      }
      
      // If currently crawling or recrawling
      if (source.crawl_status === 'in_progress' || source.crawl_status === 'recrawling') {
        return 'crawling';
      }
      
      // Default to pending for other states
      return 'pending';
    }
    
    // For other sources, derive status from requires_manual_training
    if (source.requires_manual_training === true) {
      return 'crawled'; // Needs training
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
