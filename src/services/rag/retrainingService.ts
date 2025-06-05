
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

      // Get all active sources for this agent across all types
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id, title, content, metadata, source_type')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) throw error;

      console.log(`📊 Found ${sources?.length || 0} total sources for agent ${agentId}`);

      // Filter sources that have content (including Q&A which might have structured content)
      const sourcesWithContent = (sources || []).filter(source => {
        // For Q&A sources, check if there's question/answer content
        if (source.source_type === 'qa') {
          const metadata = source.metadata as any;
          return (source.content && source.content.trim().length > 0) || 
                 (metadata?.question && metadata?.answer);
        }
        
        // For other sources, check content field
        return source.content && source.content.trim().length > 0;
      });

      console.log(`📋 Processing ${sourcesWithContent.length} sources with content:`, 
        sourcesWithContent.map(s => `${s.source_type}: ${s.title}`));

      if (sourcesWithContent.length === 0) {
        console.log('⚠️ No sources with content found for agent:', agentId);
        return false;
      }

      // Create initial progress
      const initialProgress = RetrainingProgressTracker.createInitialProgress(sourcesWithContent.length);
      RetrainingProgressTracker.updateProgress(agentId, initialProgress);

      let processedCount = 0;
      let errorCount = 0;

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

          console.log(`🔄 Processing source: ${source.title} (${source.source_type})`);
          await SourceProcessor.processSource(source as DatabaseSource);
          processedCount++;

          console.log(`✅ Processed source: ${source.title} (${processedCount}/${sourcesWithContent.length})`);
        } catch (error) {
          console.error(`❌ Failed to process source ${source.title}:`, error);
          errorCount++;
          // Continue processing other sources instead of stopping
        }
      }

      // Create completion progress
      const completedProgress = RetrainingProgressTracker.createCompletedProgress(
        sourcesWithContent.length, 
        processedCount
      );
      RetrainingProgressTracker.updateProgress(agentId, completedProgress);

      if (errorCount > 0) {
        console.log(`⚠️ Retraining completed with errors. Processed ${processedCount}/${sourcesWithContent.length} sources, ${errorCount} errors`);
      } else {
        console.log(`✅ Retraining completed successfully. Processed ${processedCount}/${sourcesWithContent.length} sources`);
      }

      return processedCount > 0; // Return true if at least one source was processed

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
