
import { supabase } from "@/integrations/supabase/client";
import { WebsiteCrawlService } from "./websiteCrawlService";

export class TrainingWorkflowService {
  // Start training for a source that's ready
  static async startSourceTraining(sourceId: string): Promise<void> {
    console.log(`🎓 Starting training workflow for source: ${sourceId}`);
    
    try {
      // First verify the source is in the correct state
      const { data: source, error: fetchError } = await supabase
        .from('agent_sources')
        .select('crawl_status, agent_id')
        .eq('id', sourceId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch source: ${fetchError.message}`);
      }

      if (source.crawl_status !== 'crawled') {
        throw new Error(`Source must be in 'crawled' status to start training. Current status: ${source.crawl_status}`);
      }

      // Start the training process
      await WebsiteCrawlService.startTraining(sourceId);
      
      // Update all child sources to training status
      await this.updateChildSourcesToTraining(sourceId);
      
    } catch (error) {
      console.error('❌ Training workflow failed:', error);
      throw error;
    }
  }

  // Update all child sources (source_pages) to training status
  private static async updateChildSourcesToTraining(parentSourceId: string): Promise<void> {
    console.log(`🔄 Updating child sources to training status for parent: ${parentSourceId}`);
    
    const { error } = await supabase
      .from('source_pages')
      .update({
        processing_status: 'training',
        updated_at: new Date().toISOString()
      })
      .eq('parent_source_id', parentSourceId)
      .eq('status', 'completed'); // Only update completed pages

    if (error) {
      console.error('❌ Error updating child sources to training:', error);
      throw error;
    }
  }

  // Mark training as completed for parent and children
  static async completeSourceTraining(sourceId: string): Promise<void> {
    console.log(`✅ Completing training workflow for source: ${sourceId}`);
    
    try {
      // Mark parent as trained
      await WebsiteCrawlService.markTrainingCompleted(sourceId);
      
      // Update all child sources to trained status
      await this.updateChildSourcesToTrained(sourceId);
      
    } catch (error) {
      console.error('❌ Failed to complete training workflow:', error);
      throw error;
    }
  }

  // Update all child sources to trained status
  private static async updateChildSourcesToTrained(parentSourceId: string): Promise<void> {
    console.log(`✅ Updating child sources to trained status for parent: ${parentSourceId}`);
    
    const { error } = await supabase
      .from('source_pages')
      .update({
        processing_status: 'trained',
        updated_at: new Date().toISOString()
      })
      .eq('parent_source_id', parentSourceId);

    if (error) {
      console.error('❌ Error updating child sources to trained:', error);
      throw error;
    }
  }

  // Check if a source is ready for training
  static async isSourceReadyForTraining(sourceId: string): Promise<boolean> {
    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('crawl_status')
      .eq('id', sourceId)
      .single();

    if (error) {
      console.error('❌ Error checking source status:', error);
      return false;
    }

    return source.crawl_status === 'crawled';
  }
}
