
export interface SourceStatusSummary {
  totalSources: number;
  hasCrawledSources: boolean;
  hasTrainingSources: boolean;
  allSourcesCompleted: boolean;
  isEmpty: boolean;
}

export interface ButtonState {
  showButton: boolean;
  buttonText: string;
  disabled: boolean;
  variant: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
}

export class SimplifiedSourceStatusService {
  static getSourceStatus(source: any): string {
    if (!source) return 'unknown';
    
    const status = source.crawl_status;
    const metadata = source.metadata || {};
    
    // Handle training completion states
    if (metadata.training_completed_at || metadata.last_trained_at) {
      return 'trained';
    }
    
    // Handle training in progress
    if (status === 'training') {
      return 'training';
    }
    
    // Handle ready for training - this was missing proper handling
    if (status === 'ready_for_training') {
      return 'ready_for_training';
    }
    
    // Handle recrawling states
    if (metadata.is_recrawling === true) {
      if (status === 'ready_for_training' || status === 'completed') {
        return 'ready_for_training';
      }
      return 'recrawling';
    }
    
    // Standard status mapping
    switch (status) {
      case 'pending':
        return 'pending';
      case 'in_progress':
        return 'in_progress';
      case 'completed':
        // Check if this should actually be ready_for_training
        if (source.total_jobs > 0 && source.completed_jobs === source.total_jobs) {
          return 'ready_for_training';
        }
        return 'completed';
      case 'failed':
        return 'failed';
      case 'trained':
        return 'trained';
      default:
        return status || 'unknown';
    }
  }

  static analyzeSourceStatus(sources: any[]): SourceStatusSummary {
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

    const hasCrawledSources = sources.some(s => 
      s.crawl_status && ['completed', 'ready_for_training', 'trained'].includes(s.crawl_status)
    );
    
    const hasTrainingSources = sources.some(s => s.requires_manual_training === true);
    
    const allSourcesCompleted = sources.every(s => {
      const status = this.getSourceStatus(s);
      return ['completed', 'ready_for_training', 'trained'].includes(status);
    });

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
        buttonText: '',
        disabled: true,
        variant: 'default'
      };
    }

    if (statusSummary.hasTrainingSources) {
      return {
        showButton: true,
        buttonText: 'Train Agent',
        disabled: false,
        variant: 'default'
      };
    }

    if (statusSummary.allSourcesCompleted) {
      return {
        showButton: true,
        buttonText: 'Agent Trained',
        disabled: true,
        variant: 'secondary'
      };
    }

    return {
      showButton: false,
      buttonText: '',
      disabled: true,
      variant: 'default'
    };
  }
}
