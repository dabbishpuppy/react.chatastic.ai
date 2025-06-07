
import { ParentSource } from './types.ts';

export class MetadataManager {
  static createMetadata(
    parentSource: ParentSource,
    status: string,
    totalChildSize: number,
    completedJobsData: any[],
    isRecrawling: boolean
  ): any {
    const baseMetadata = {
      ...(parentSource.metadata || {}),
      last_aggregation: new Date().toISOString(),
      total_child_pages_size: totalChildSize,
      child_pages_count: completedJobsData.length,
      size_calculation_method: 'child_page_aggregation'
    };

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
    } else {
      console.log('📝 Normal processing - updating metadata with size info');
      return baseMetadata;
    }
  }
}
