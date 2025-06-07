
/**
 * Service to map complex workflow states to simplified UI statuses
 */
export class SimplifiedSourceStatusService {
  /**
   * Map a source object to a simplified status for UI display
   */
  static getSourceStatus(source: any): string {
    // Check workflow_status first (new system)
    if (source.workflow_status) {
      switch (source.workflow_status) {
        case 'CREATED':
          return 'pending';
        case 'CRAWLING':
          return 'crawling';
        case 'COMPLETED':
          return source.requires_manual_training ? 'ready_for_training' : 'crawled';
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
          return 'pending';
      }
    }

    // Fall back to legacy crawl_status
    if (source.crawl_status) {
      switch (source.crawl_status) {
        case 'in_progress':
          return 'crawling';
        case 'completed':
          return source.requires_manual_training ? 'ready_for_training' : 'crawled';
        case 'failed':
          return 'failed';
        case 'training':
          return 'training';
        case 'training_completed':
          return 'trained';
        default:
          return 'pending';
      }
    }

    // Check if source has been trained
    if (source.unique_chunks && source.unique_chunks > 0) {
      return 'trained';
    }

    // Check if source has content but needs training
    if (source.content || source.total_content_size > 0) {
      return source.requires_manual_training ? 'ready_for_training' : 'crawled';
    }

    // Default fallback
    return 'pending';
  }

  /**
   * Get progress percentage for a source
   */
  static getSourceProgress(source: any): number {
    if (source.progress !== undefined && source.progress !== null) {
      return Math.max(0, Math.min(100, source.progress));
    }

    // Calculate progress based on children if it's a parent source
    if (source.total_children && source.total_children > 0) {
      const completed = source.children_completed || 0;
      return Math.round((completed / source.total_children) * 100);
    }

    // Default progress based on status
    const status = this.getSourceStatus(source);
    switch (status) {
      case 'pending':
        return 0;
      case 'crawling':
        return 25;
      case 'crawled':
      case 'ready_for_training':
        return 50;
      case 'training':
        return 75;
      case 'trained':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Check if a source is currently processing
   */
  static isSourceProcessing(source: any): boolean {
    const status = this.getSourceStatus(source);
    return ['crawling', 'training'].includes(status);
  }

  /**
   * Check if a source has completed successfully
   */
  static isSourceCompleted(source: any): boolean {
    const status = this.getSourceStatus(source);
    return ['trained'].includes(status);
  }

  /**
   * Check if a source has failed
   */
  static isSourceFailed(source: any): boolean {
    const status = this.getSourceStatus(source);
    return ['failed'].includes(status);
  }

  /**
   * Source status summary for analytics
   */
  static analyzeSourceStatus(sources: any[]): SourceStatusSummary {
    const summary: SourceStatusSummary = {
      total: sources.length,
      pending: 0,
      crawling: 0,
      crawled: 0,
      training: 0,
      trained: 0,
      failed: 0,
      ready_for_training: 0
    };

    sources.forEach(source => {
      const status = this.getSourceStatus(source);
      summary[status as keyof SourceStatusSummary]++;
    });

    return summary;
  }

  /**
   * Determine button state for source operations
   */
  static determineButtonState(source: any): ButtonState {
    const status = this.getSourceStatus(source);
    const isProcessing = this.isSourceProcessing(source);

    return {
      canEdit: !isProcessing,
      canDelete: !isProcessing,
      canRecrawl: ['failed', 'crawled', 'trained'].includes(status),
      canTrain: status === 'ready_for_training',
      showProgress: isProcessing
    };
  }
}

export interface SourceStatusSummary {
  total: number;
  pending: number;
  crawling: number;
  crawled: number;
  training: number;
  trained: number;
  failed: number;
  ready_for_training: number;
}

export interface ButtonState {
  canEdit: boolean;
  canDelete: boolean;
  canRecrawl: boolean;
  canTrain: boolean;
  showProgress: boolean;
}
