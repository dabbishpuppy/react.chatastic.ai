
import { RetrainingProgressTracker } from './retraining/retrainingProgressTracker';
import { SourceProcessor } from './retraining/sourceProcessor';
import { RetrainingChecker } from './retraining/retrainingChecker';
import { supabase } from "@/integrations/supabase/client";
import { DatabaseSource, RetrainingProgress, RetrainingStatus } from './types/retrainingTypes';

export type { RetrainingProgress, RetrainingStatus } from './types/retrainingTypes';

export class RetrainingService {
  static async retrainAgent(
    agentId: string, 
    onProgress?: (progress: RetrainingProgress) => void
  ): Promise<boolean> {
    console.log('🔄 Starting agent retraining:', agentId);
    
    try {
      // Set up progress tracking
      if (onProgress) {
        RetrainingProgressTracker.setProgressCallback(agentId, onProgress);
      }

      // Get all sources for this agent
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id, title, content, metadata, source_type')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) throw error;

      // Filter sources that have content
      const sourcesWithContent = (sources || []).filter(source => 
        source.content && source.content.trim().length > 0
      );

      if (sourcesWithContent.length === 0) {
        console.log('⚠️ No sources with content found for agent:', agentId);
        return false;
      }

      // Create initial progress
      const initialProgress = RetrainingProgressTracker.createInitialProgress(sourcesWithContent.length);
      RetrainingProgressTracker.updateProgress(agentId, initialProgress);

      let processedCount = 0;

      // Process each source
      for (const source of sourcesWithContent) {
        try {
          const currentProgress: RetrainingProgress = {
            ...initialProgress,
            processedSources: processedCount,
            currentSource: source.title,
            status: 'processing'
          };
          RetrainingProgressTracker.updateProgress(agentId, currentProgress);

          await SourceProcessor.processSource(source as DatabaseSource);
          processedCount++;

          console.log(`✅ Processed source: ${source.title} (${processedCount}/${sourcesWithContent.length})`);
        } catch (error) {
          console.error(`❌ Failed to process source ${source.title}:`, error);
          // Continue processing other sources
        }
      }

      // Create completion progress
      const completedProgress = RetrainingProgressTracker.createCompletedProgress(
        sourcesWithContent.length, 
        processedCount
      );
      RetrainingProgressTracker.updateProgress(agentId, completedProgress);

      console.log(`✅ Retraining completed. Processed ${processedCount}/${sourcesWithContent.length} sources`);
      return true;

    } catch (error) {
      console.error('❌ Retraining failed:', error);
      
      const errorProgress = RetrainingProgressTracker.createErrorProgress(
        error instanceof Error ? error.message : 'Unknown error'
      );
      RetrainingProgressTracker.updateProgress(agentId, errorProgress);
      
      throw error;
    } finally {
      // Clean up progress tracking
      if (onProgress) {
        RetrainingProgressTracker.removeProgressCallback(agentId);
      }
    }
  }

  static async checkRetrainingNeeded(agentId: string): Promise<RetrainingStatus> {
    return RetrainingChecker.checkRetrainingNeeded(agentId);
  }
}
