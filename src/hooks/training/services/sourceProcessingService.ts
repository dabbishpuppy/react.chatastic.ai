
import { AgentSource } from '@/types/rag';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessingResult {
  success: boolean;
  processedSources: number;
  processedChunks: number;
  errors: string[];
}

export class SourceProcessingService {
  static async processSources(
    agentId: string, 
    sources: AgentSource[]
  ): Promise<ProcessingResult> {
    console.log('🔄 Processing sources for training:', {
      agentId,
      sourceCount: sources.length
    });

    let processedSources = 0;
    let processedChunks = 0;
    const errors: string[] = [];

    try {
      for (const source of sources) {
        try {
          // Process each source and generate chunks/embeddings
          const { data: chunks, error } = await supabase
            .from('source_chunks')
            .select('id')
            .eq('source_id', source.id);

          if (error) {
            errors.push(`Failed to process source ${source.id}: ${error.message}`);
            continue;
          }

          processedSources++;
          processedChunks += chunks?.length || 0;

          console.log(`✅ Processed source ${source.id}: ${chunks?.length || 0} chunks`);
        } catch (sourceError) {
          const errorMsg = sourceError instanceof Error 
            ? sourceError.message 
            : 'Unknown error';
          errors.push(`Error processing source ${source.id}: ${errorMsg}`);
        }
      }

      return {
        success: errors.length === 0,
        processedSources,
        processedChunks,
        errors
      };
    } catch (error) {
      console.error('❌ Error in source processing:', error);
      return {
        success: false,
        processedSources,
        processedChunks,
        errors: [error instanceof Error ? error.message : 'Unknown processing error']
      };
    }
  }

  static async validateSources(sources: AgentSource[]): Promise<AgentSource[]> {
    return sources.filter(source => 
      source.is_active && 
      !source.is_excluded &&
      source.content && 
      source.content.trim().length > 0
    );
  }

  static async fetchAndProcessSources(
    agentId: string,
    setTrainingProgress: Function,
    markAgentCompletion: Function,
    sessionId: string,
    refs: any
  ): Promise<boolean> {
    try {
      console.log('🔄 Fetching and processing sources for agent:', agentId);
      
      // Fetch sources for the agent
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching sources:', error);
        return false;
      }

      if (!sources || sources.length === 0) {
        console.log('ℹ️ No active sources found for agent');
        return false;
      }

      // Validate sources
      const validSources = await this.validateSources(sources);
      
      if (validSources.length === 0) {
        console.log('ℹ️ No valid sources found after validation');
        return false;
      }

      // Process sources
      const result = await this.processSources(agentId, validSources);
      
      // Update training progress
      setTrainingProgress({
        agentId,
        status: result.success ? 'completed' : 'error',
        processedSources: result.processedSources,
        totalSources: validSources.length,
        processedChunks: result.processedChunks,
        totalChunks: result.processedChunks,
        progress: 100,
        errors: result.errors
      });

      if (result.success) {
        markAgentCompletion(sessionId);
      }

      return result.success;
    } catch (error) {
      console.error('❌ Error in fetchAndProcessSources:', error);
      return false;
    }
  }
}
