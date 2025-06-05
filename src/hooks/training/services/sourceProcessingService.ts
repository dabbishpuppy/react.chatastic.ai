
import { supabase } from '@/integrations/supabase/client';
import { DatabaseSource } from '../types';
import { SourceProcessor } from '@/services/rag/retraining/sourceProcessor';

export class SourceProcessingService {
  static async fetchAndProcessSources(
    agentId: string,
    setTrainingProgress: React.Dispatch<React.SetStateAction<any>>,
    markAgentCompletion: (sessionId: string) => void,
    sessionId: string,
    refs: any
  ): Promise<boolean> {
    const { data: agentSources, error: sourcesError } = await supabase
      .from('agent_sources')
      .select('id, source_type, metadata, title, content')
      .eq('agent_id', agentId)
      .eq('is_active', true);

    if (sourcesError) throw sourcesError;
    if (!agentSources || agentSources.length === 0) return false;

    const sourcesToProcess = [];
    let totalPages = 0;

    for (const source of agentSources as DatabaseSource[]) {
      const metadata = (source.metadata as Record<string, any>) || {};
      
      if (source.source_type === 'website') {
        const { data: unprocessedPages } = await supabase
          .from('source_pages')
          .select('id')
          .eq('parent_source_id', source.id)
          .eq('status', 'completed')
          .in('processing_status', ['pending', null]);

        if (unprocessedPages && unprocessedPages.length > 0) {
          sourcesToProcess.push(source);
          totalPages += unprocessedPages.length;
        }
      } else {
        const hasContent = source.source_type === 'qa' ? 
          (metadata?.question && metadata?.answer) :
          source.content && source.content.trim().length > 0;

        if (hasContent && metadata.processing_status !== 'completed') {
          sourcesToProcess.push(source);
          totalPages += 1;
        }
      }
    }

    if (sourcesToProcess.length === 0) {
      refs.trainingStateRef.current = 'completed';
      refs.globalTrainingActiveRef.current = false;
      markAgentCompletion(sessionId);
      setTrainingProgress({
        agentId,
        status: 'completed',
        progress: 100,
        totalSources: 0,
        processedSources: 0,
        sessionId
      });
      return false;
    }

    setTrainingProgress({
      agentId,
      status: 'training',
      progress: 0,
      totalSources: totalPages,
      processedSources: 0,
      currentlyProcessing: [],
      sessionId
    });

    const processingPromises = sourcesToProcess.map(async (source) => {
      return SourceProcessor.processSource(source);
    });

    await Promise.allSettled(processingPromises);
    return true;
  }
}
