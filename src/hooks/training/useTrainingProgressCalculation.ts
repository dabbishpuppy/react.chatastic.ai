
import { supabase } from '@/integrations/supabase/client';

interface DatabaseSource {
  id: string;
  source_type: string;
  metadata: any;
  title: string;
  content?: string;
}

interface TrainingProgress {
  agentId: string;
  status: 'idle' | 'training' | 'completed' | 'failed';
  progress: number;
  totalSources: number;
  processedSources: number;
  currentlyProcessing?: string[];
}

export const useTrainingProgressCalculation = () => {
  const calculateTrainingProgress = async (agentId: string): Promise<TrainingProgress | null> => {
    try {
      const { data: agentSources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title, content, crawl_status')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error fetching agent sources:', sourcesError);
        return null;
      }

      if (!agentSources || agentSources.length === 0) {
        return null;
      }

      const sourcesNeedingTraining = [];
      let totalPagesNeedingProcessing = 0;
      let totalPagesProcessed = 0;
      let currentlyProcessingPages: string[] = [];

      for (const source of agentSources as DatabaseSource[]) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          const { data: pages } = await supabase
            .from('source_pages')
            .select('id, url, processing_status, status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          if (pages && pages.length > 0) {
            const pendingPages = pages.filter(p => !p.processing_status || p.processing_status === 'pending');
            const processingPages = pages.filter(p => p.processing_status === 'processing');
            const processedPages = pages.filter(p => p.processing_status === 'processed');

            if (pendingPages.length > 0 || processingPages.length > 0) {
              sourcesNeedingTraining.push(source);
            }
            
            totalPagesNeedingProcessing += pages.length;
            totalPagesProcessed += processedPages.length;
            
            currentlyProcessingPages.push(...processingPages.map(p => p.url || p.id));
          }
        } else {
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          if (hasContent && metadata.processing_status !== 'completed') {
            sourcesNeedingTraining.push(source);
            totalPagesNeedingProcessing += 1;
            
            if (metadata.processing_status === 'completed') {
              totalPagesProcessed += 1;
            } else if (metadata.processing_status === 'processing') {
              currentlyProcessingPages.push(source.title);
            }
          }
        }
      }

      const progress = totalPagesNeedingProcessing > 0 ? 
        Math.round((totalPagesProcessed / totalPagesNeedingProcessing) * 100) : 100;

      let status: 'idle' | 'training' | 'completed' | 'failed' = 'idle';
      
      if (currentlyProcessingPages.length > 0) {
        status = 'training';
      } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
        status = 'completed';
      } else if (totalPagesProcessed > 0 && totalPagesProcessed < totalPagesNeedingProcessing) {
        status = 'training';
      }

      // Only log significant progress updates
      if (status === 'completed' || currentlyProcessingPages.length > 0) {
        console.log('📊 Training progress:', {
          status,
          progress: `${progress}%`,
          processed: `${totalPagesProcessed}/${totalPagesNeedingProcessing}`
        });
      }

      return {
        agentId,
        status,
        progress,
        totalSources: totalPagesNeedingProcessing,
        processedSources: totalPagesProcessed,
        currentlyProcessing: currentlyProcessingPages
      };

    } catch (error) {
      console.error('Error calculating training progress:', error);
      return null;
    }
  };

  return { calculateTrainingProgress };
};
