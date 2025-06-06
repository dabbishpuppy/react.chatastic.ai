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
    
    // Check if currently training
    if (metadata.training_status === 'in_progress') {
      return 'training';
    }
    
    // FIXED: Check if training completed - for website sources, look for children_training_completed
    if (metadata.training_completed_at || metadata.last_trained_at || metadata.children_training_completed) {
      // For website sources, if all children are trained, it's training_completed
      if (source.source_type === 'website' && source.parent_source_id === null) {
        // Check if crawl_status is 'completed' AND training is done
        if (source.crawl_status === 'completed' && (metadata.training_status === 'completed' || metadata.children_training_completed)) {
          return 'training_completed';
        }
        // If training status shows completed but crawl_status hasn't been updated yet
        if (metadata.training_status === 'completed') {
          return 'training_completed';
        }
      }
      return 'trained';
    }
    
    // For website sources, check crawl_status
    if (source.source_type === 'website') {
      // Handle "ready_for_training" status properly
      if ((source.crawl_status === 'ready_for_training' || source.crawl_status === 'completed') && source.requires_manual_training === true) {
        return 'crawled'; // Ready for training
      }
      
      // If training status is set to training
      if (source.crawl_status === 'training' || metadata.training_status === 'in_progress') {
        return 'training';
      }
      
      // FIXED: If crawl is completed AND requires_manual_training is false, check training status
      if (source.crawl_status === 'completed' && source.requires_manual_training === false) {
        // If we have training completion indicators, it's fully completed
        if (metadata.training_completed_at || metadata.last_trained_at || metadata.children_training_completed) {
          return 'training_completed';
        }
        // Otherwise it's just ready for training
        return 'crawled';
      }
      
      // If currently crawling or recrawling
      if (source.crawl_status === 'in_progress' || source.crawl_status === 'recrawling') {
        return 'crawling';
      }
      
      // Default to pending for other states
      return 'pending';
    }
    
    // For other sources, derive status from requires_manual_training and training indicators
    if (source.requires_manual_training === true) {
      return 'crawled'; // Needs training
    }
    
    // If no manual training required and we have training completion indicators
    if (metadata.training_completed_at || metadata.last_trained_at) {
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
