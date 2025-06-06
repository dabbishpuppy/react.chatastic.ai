export type SourceStatus = 'pending' | 'crawling' | 'crawled' | 'training' | 'completed' | 'trained' | 'training_completed' | 'failed' | 'in_progress' | 'ready_for_training';

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
    
    console.log('🔍 Analyzing source status for:', source.id, {
      crawl_status: source.crawl_status,
      requires_manual_training: source.requires_manual_training,
      source_type: source.source_type,
      parent_source_id: source.parent_source_id,
      metadata: metadata
    });

    // Check if currently training
    if (metadata.training_status === 'in_progress') {
      console.log('✅ Status: TRAINING (metadata.training_status = in_progress)');
      return 'training';
    }
    
    // Check if training completed successfully
    if (metadata.training_status === 'completed' || 
        metadata.children_training_completed === true ||
        metadata.training_completed_at || 
        metadata.last_trained_at) {
      
      // For website parent sources
      if (source.source_type === 'website' && source.parent_source_id === null) {
        console.log('✅ Status: TRAINING_COMPLETED (website parent with training completed)');
        return 'training_completed';
      }
      
      // For other sources (including child sources)
      console.log('✅ Status: TRAINED (training completed)');
      return 'trained';
    }
    
    // Check for training failures
    if (metadata.training_status === 'failed' || metadata.training_error) {
      console.log('✅ Status: FAILED (training failed)');
      return 'failed';
    }
    
    // For website sources, check crawl_status
    if (source.source_type === 'website') {
      // Handle training state during training flow
      if (source.crawl_status === 'training' || metadata.training_status === 'in_progress') {
        console.log('✅ Status: TRAINING (crawl_status = training)');
        return 'training';
      }
      
      // If crawl is completed and requires manual training
      if ((source.crawl_status === 'completed' || source.crawl_status === 'ready_for_training') && 
          source.requires_manual_training === true) {
        console.log('✅ Status: CRAWLED (ready for training)');
        return 'crawled';
      }
      
      // If crawl is completed and no manual training required, check for training completion
      if (source.crawl_status === 'completed' && source.requires_manual_training === false) {
        // If we have training completion indicators, it's fully completed
        if (metadata.training_completed_at || metadata.last_trained_at || metadata.children_training_completed) {
          console.log('✅ Status: TRAINING_COMPLETED (auto-trained)');
          return 'training_completed';
        }
        // Otherwise it's ready for training
        console.log('✅ Status: CRAWLED (completed crawl, ready for training)');
        return 'crawled';
      }
      
      // If currently crawling or recrawling
      if (source.crawl_status === 'in_progress' || source.crawl_status === 'recrawling') {
        console.log('✅ Status: CRAWLING');
        return 'crawling';
      }
      
      // Handle failed crawl status
      if (source.crawl_status === 'failed') {
        console.log('✅ Status: FAILED (crawl failed)');
        return 'failed';
      }
      
      // Default to pending for other states
      console.log('✅ Status: PENDING (default for website)');
      return 'pending';
    }
    
    // For other sources, derive status from requires_manual_training and training indicators
    if (source.requires_manual_training === true) {
      console.log('✅ Status: CRAWLED (requires manual training)');
      return 'crawled'; // Needs training
    }
    
    // If no manual training required and we have training completion indicators
    if (metadata.training_completed_at || metadata.last_trained_at) {
      console.log('✅ Status: COMPLETED (already trained)');
      return 'completed';
    }
    
    console.log('✅ Status: COMPLETED (default)');
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
