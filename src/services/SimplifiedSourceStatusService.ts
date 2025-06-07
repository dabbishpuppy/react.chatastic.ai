
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
}
