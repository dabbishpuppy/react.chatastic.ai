
import { supabase } from '@/integrations/supabase/client';
import { DatabaseSource } from '../types';

export interface SourceAnalysisResult {
  sourcesNeedingTraining: DatabaseSource[];
  totalPagesNeedingProcessing: number;
  totalPagesProcessed: number;
  currentlyProcessingPages: string[];
  hasFailedSources: boolean;
}

export class TrainingSourceAnalysisService {
  static async analyzeAgentSources(agentId: string): Promise<SourceAnalysisResult> {
    const { data: agentSources, error: sourcesError } = await supabase
      .from('agent_sources')
      .select('id, source_type, metadata, title, content, crawl_status')
      .eq('agent_id', agentId)
      .eq('is_active', true);

    if (sourcesError) {
      throw sourcesError;
    }

    if (!agentSources || agentSources.length === 0) {
      return {
        sourcesNeedingTraining: [],
        totalPagesNeedingProcessing: 0,
        totalPagesProcessed: 0,
        currentlyProcessingPages: [],
        hasFailedSources: false
      };
    }

    const sourcesNeedingTraining = [];
    let totalPagesNeedingProcessing = 0;
    let totalPagesProcessed = 0;
    let currentlyProcessingPages: string[] = [];
    let hasFailedSources = false;

    console.log('🔍 ENHANCED: Checking training completion for', agentSources.length, 'sources');

    for (const source of agentSources as DatabaseSource[]) {
      const metadata = (source.metadata as Record<string, any>) || {};
      
      if (source.source_type === 'website') {
        const { data: pages } = await supabase
          .from('source_pages')
          .select('id, url, processing_status, status')
          .eq('parent_source_id', source.id)
          .eq('status', 'completed');

        if (pages && pages.length > 0) {
          const pendingPages = pages.filter(p => 
            !p.processing_status || 
            p.processing_status === 'pending' || 
            p.processing_status === null
          );
          const processingPages = pages.filter(p => p.processing_status === 'processing');
          const processedPages = pages.filter(p => p.processing_status === 'processed');
          const failedPages = pages.filter(p => p.processing_status === 'failed');

          console.log(`📊 Website source ${source.title}:`, {
            totalPages: pages.length,
            pending: pendingPages.length,
            processing: processingPages.length,
            processed: processedPages.length,
            failed: failedPages.length
          });

          if (failedPages.length > 0) {
            hasFailedSources = true;
          }

          if (pendingPages.length > 0 || processingPages.length > 0) {
            sourcesNeedingTraining.push(source);
            console.log(`✅ NEEDS TRAINING: ${source.title} has ${pendingPages.length + processingPages.length} unprocessed pages`);
          } else {
            console.log(`✅ PROCESSED: ${source.title} all pages processed`);
          }
          
          totalPagesNeedingProcessing += pages.length;
          totalPagesProcessed += processedPages.length;
          
          currentlyProcessingPages.push(...processingPages.map(p => p.url || p.id));
        }
      } else {
        const hasContent = source.source_type === 'qa' ? 
          (metadata?.question && metadata?.answer) :
          source.content && source.content.trim().length > 0;

        if (hasContent) {
          if (metadata.processing_status === 'failed') {
            hasFailedSources = true;
          }
          
          if (metadata.processing_status !== 'completed') {
            sourcesNeedingTraining.push(source);
            totalPagesNeedingProcessing += 1;
            
            if (metadata.processing_status === 'processing') {
              currentlyProcessingPages.push(source.title);
            }
          } else {
            totalPagesNeedingProcessing += 1;
            totalPagesProcessed += 1;
          }
        }
      }
    }

    return {
      sourcesNeedingTraining,
      totalPagesNeedingProcessing,
      totalPagesProcessed,
      currentlyProcessingPages,
      hasFailedSources
    };
  }
}
