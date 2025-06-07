
export interface SourceStatusSummary {
  totalSources: number;
  hasCrawledSources: boolean;
  hasTrainingSources: boolean;
  allSourcesCompleted: boolean;
  isEmpty: boolean;
}

export interface ButtonState {
  text: string;
  disabled: boolean;
  variant: 'default' | 'secondary';
  showProgress?: boolean;
  canRecrawl?: boolean;
  canTrain?: boolean;
  canDelete?: boolean;
}

export class SimplifiedSourceStatusService {
  /**
   * Get simplified status for a single source
   */
  static getSourceStatus(source: any): string {
    if (!source) return 'pending';
    
    // Handle workflow status first
    if (source.workflow_status) {
      switch (source.workflow_status) {
        case 'CREATED':
          return 'pending';
        case 'CRAWLING':
          return 'in_progress';
        case 'COMPLETED':
          return 'completed';
        case 'TRAINING':
          return 'training';
        case 'TRAINED':
          return 'trained';
        case 'PENDING_REMOVAL':
          return 'pending_removal';
        case 'REMOVED':
          return 'removed';
        case 'ERROR':
          return 'failed';
        default:
          break;
      }
    }
    
    // Handle legacy crawl_status
    if (source.crawl_status) {
      switch (source.crawl_status) {
        case 'pending':
          return 'pending';
        case 'in_progress':
          return 'in_progress';
        case 'completed':
          return source.requires_manual_training ? 'ready_for_training' : 'completed';
        case 'ready_for_training':
          return 'ready_for_training';
        case 'training':
          return 'training';
        case 'training_completed':
          return 'trained';
        case 'failed':
          return 'failed';
        default:
          return source.crawl_status;
      }
    }
    
    // Check if pending deletion
    if (source.pending_deletion) {
      return 'pending_removal';
    }
    
    return 'pending';
  }

  static analyzeSourceStatus(sources: any[]): SourceStatusSummary {
    const totalSources = sources.length;
    const hasCrawledSources = sources.some(s => 
      s.crawl_status === 'completed' || s.crawl_status === 'ready_for_training'
    );
    const hasTrainingSources = sources.some(s => s.requires_manual_training === true);
    const allSourcesCompleted = sources.length > 0 && sources.every(s => 
      s.crawl_status === 'completed' || s.crawl_status === 'training_completed'
    );

    return {
      totalSources,
      hasCrawledSources,
      hasTrainingSources,
      allSourcesCompleted,
      isEmpty: totalSources === 0
    };
  }

  static determineButtonState(summary: SourceStatusSummary): ButtonState;
  static determineButtonState(source: any): ButtonState;
  static determineButtonState(input: SourceStatusSummary | any): ButtonState {
    // Handle single source input
    if (input && typeof input === 'object' && 'id' in input) {
      const source = input;
      const status = this.getSourceStatus(source);
      
      return {
        text: this.getStatusText(status),
        disabled: this.isStatusDisabled(status),
        variant: this.getStatusVariant(status),
        showProgress: status === 'in_progress' || status === 'training',
        canRecrawl: status !== 'in_progress' && status !== 'training' && status !== 'pending_removal',
        canTrain: status === 'ready_for_training' || status === 'completed',
        canDelete: status !== 'pending_removal'
      };
    }
    
    // Handle SourceStatusSummary input (legacy)
    const summary = input as SourceStatusSummary;
    if (summary.isEmpty) {
      return {
        text: 'No sources to train',
        disabled: true,
        variant: 'secondary',
        showProgress: false,
        canRecrawl: false,
        canTrain: false,
        canDelete: false
      };
    }

    if (summary.hasTrainingSources) {
      return {
        text: 'Start Training',
        disabled: false,
        variant: 'default',
        showProgress: false,
        canRecrawl: true,
        canTrain: true,
        canDelete: true
      };
    }

    if (summary.allSourcesCompleted) {
      return {
        text: 'All sources trained',
        disabled: true,
        variant: 'secondary',
        showProgress: false,
        canRecrawl: true,
        canTrain: false,
        canDelete: true
      };
    }

    return {
      text: 'Waiting for crawling to complete',
      disabled: true,
      variant: 'secondary',
      showProgress: true,
      canRecrawl: false,
      canTrain: false,
      canDelete: true
    };
  }

  private static getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Start Crawl';
      case 'in_progress': return 'Crawling...';
      case 'completed': return 'Completed';
      case 'ready_for_training': return 'Ready for Training';
      case 'training': return 'Training...';
      case 'trained': return 'Trained';
      case 'failed': return 'Failed';
      case 'pending_removal': return 'Pending Removal';
      default: return 'Unknown';
    }
  }

  private static isStatusDisabled(status: string): boolean {
    return ['in_progress', 'training', 'pending_removal'].includes(status);
  }

  private static getStatusVariant(status: string): 'default' | 'secondary' {
    return ['ready_for_training', 'pending'].includes(status) ? 'default' : 'secondary';
  }
}
