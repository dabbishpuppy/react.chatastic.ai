
import { ParentSource } from './types.ts';

export class MetadataManager {
  static createMetadata(
    parentSource: ParentSource,
    status: string,
    totalChildSize: number,
    completedJobsData: any[],
    isRecrawling: boolean,
    eventType?: string
  ): any {
    const baseMetadata = {
      ...(parentSource.metadata || {}),
      last_aggregation: new Date().toISOString(),
      total_child_pages_size: totalChildSize,
      child_pages_count: completedJobsData.length,
      size_calculation_method: 'child_page_aggregation'
    };

    // Special handling for training completion events - FIXED: Handle all training completion event types
    if (eventType === 'training_completion_metadata_update' || 
        eventType === 'training_completed' || 
        eventType === 'training_complete') {
      console.log('🎓 Training completion metadata update - preserving training info and updating size');
      return {
        ...baseMetadata,
        training_metadata_updated: new Date().toISOString(),
        final_total_child_pages_size: totalChildSize,
        last_trained_at: parentSource.metadata?.last_trained_at || new Date().toISOString(),
        training_status: 'completed',
        training_completed_at: parentSource.metadata?.training_completed_at || new Date().toISOString()
      };
    }

    if (status === 'ready_for_training' || status === 'failed') {
      console.log(`🏁 Recrawl completed with status: ${status}, clearing recrawl flags`);
      return {
        ...baseMetadata,
        is_recrawling: false,
        recrawl_completed_at: new Date().toISOString()
      };
    } else if (isRecrawling) {
      console.log('🔄 Preserving recrawl metadata during processing');
      return baseMetadata;
    } else if (status === 'completed' || status === 'trained') {
      console.log('🎓 Training completed - updating metadata with final size info');
      return {
        ...baseMetadata,
        training_metadata_updated: new Date().toISOString(),
        final_total_child_pages_size: totalChildSize,
        // Preserve existing training metadata
        last_trained_at: parentSource.metadata?.last_trained_at,
        training_completed_at: parentSource.metadata?.training_completed_at,
        training_status: parentSource.metadata?.training_status
      };
    } else {
      console.log('📝 Normal processing - updating metadata with size info');
      return baseMetadata;
    }
  }
}
