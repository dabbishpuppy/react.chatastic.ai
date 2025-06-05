
import { supabase } from '@/integrations/supabase/client';

export class TrainingValidationService {
  static async validateTrainingCompletion(agentId: string): Promise<boolean> {
    try {
      console.log('🔍 ENHANCED VALIDATION: Checking actual training completion status');
      
      // Check if chunks exist for any sources of this agent
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error checking agent sources:', sourcesError);
        return false;
      }

      if (!agentSources || agentSources.length === 0) {
        console.log('🔍 ENHANCED VALIDATION: No sources found for agent');
        return false;
      }

      const sourceIds = agentSources.map(s => s.id);
      
      // Check if chunks exist for these sources
      const { data: chunks, error: chunksError } = await supabase
        .from('source_chunks')
        .select('id')
        .in('source_id', sourceIds)
        .limit(1);

      if (chunksError) {
        console.error('Error checking chunks:', chunksError);
        return false;
      }

      const hasChunks = chunks && chunks.length > 0;
      console.log('🔍 ENHANCED VALIDATION: Agent has chunks:', hasChunks);

      // Check if all sources are processed
      const { data: allAgentSources, error: allSourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (allSourcesError) {
        console.error('Error checking sources:', allSourcesError);
        return false;
      }

      let allSourcesProcessed = true;
      for (const source of allAgentSources || []) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          const { data: pages } = await supabase
            .from('source_pages')
            .select('processing_status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          const hasUnprocessedPages = pages?.some(p => 
            !p.processing_status || 
            p.processing_status === 'pending' || 
            p.processing_status === 'processing'
          );

          if (hasUnprocessedPages) {
            allSourcesProcessed = false;
            break;
          }
        } else {
          if (metadata.processing_status !== 'completed') {
            allSourcesProcessed = false;
            break;
          }
        }
      }

      console.log('🔍 ENHANCED VALIDATION: All sources processed:', allSourcesProcessed);
      
      const isActuallyComplete = hasChunks && allSourcesProcessed;
      console.log('🔍 ENHANCED VALIDATION: Training actually complete:', isActuallyComplete);
      
      return isActuallyComplete;
    } catch (error) {
      console.error('Error validating training completion:', error);
      return false;
    }
  }
}
