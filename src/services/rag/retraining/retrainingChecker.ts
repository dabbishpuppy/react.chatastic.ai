
import { supabase } from "@/integrations/supabase/client";
import { RetrainingStatus } from '../types/retrainingTypes';

export class RetrainingChecker {
  static async checkRetrainingNeeded(agentId: string): Promise<RetrainingStatus> {
    try {
      console.log('🔍 Checking retraining status for agent:', agentId);

      // Get all active sources for this agent
      const { data: sources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('id, title, source_type, metadata, content, created_at, crawl_status')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) {
        console.error('Error fetching sources:', sourcesError);
        throw sourcesError;
      }

      if (!sources || sources.length === 0) {
        return {
          needed: false,
          unprocessedSources: 0,
          reasons: [],
          status: 'no_sources',
          message: 'No sources found for this agent.',
          sourceDetails: []
        };
      }

      const unprocessedSources = [];
      const reasons = [];

      // Check each source
      for (const source of sources) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          // For website sources, check if there are crawled pages that need processing
          const { data: unprocessedPages, error: pagesError } = await supabase
            .from('source_pages')
            .select('id, url, status, processing_status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed') // Only completed crawled pages
            .neq('processing_status', 'processed'); // That haven't been fully processed yet

          if (pagesError) {
            console.error('Error checking source pages:', pagesError);
            continue;
          }

          // Check for truly unprocessed pages (no chunks created)
          if (unprocessedPages && unprocessedPages.length > 0) {
            const pageIds = unprocessedPages.map(p => p.id);
            const { data: existingChunks } = await supabase
              .from('source_chunks')
              .select('id')
              .in('source_id', pageIds)
              .limit(1);

            // Only include if no chunks exist for these pages AND crawl was recently completed
            if (!existingChunks || existingChunks.length === 0) {
              // Check if this is a recently crawled source (within last hour) or has "completed" crawl_status
              const isRecentlyCrawled = source.crawl_status === 'completed' || 
                (new Date().getTime() - new Date(source.created_at).getTime() < 60 * 60 * 1000);
              
              if (isRecentlyCrawled) {
                unprocessedSources.push({
                  id: source.id,
                  title: source.title,
                  type: 'website',
                  reason: `${unprocessedPages.length} crawled page${unprocessedPages.length > 1 ? 's' : ''} need${unprocessedPages.length === 1 ? 's' : ''} processing`,
                  status: 'Crawled - Needs Training',
                  unprocessedPagesCount: unprocessedPages.length
                });
                reasons.push(`Website "${source.title}" has ${unprocessedPages.length} crawled pages that need processing`);
              }
            }
          }
        } else {
          // For other source types, check if they have content and haven't been processed
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          const processingStatus = metadata?.processing_status;

          // Only include if truly unprocessed and has content
          if (hasContent && processingStatus !== 'completed') {
            // Double-check: verify no chunks exist for this source
            const { data: existingChunks } = await supabase
              .from('source_chunks')
              .select('id')
              .eq('source_id', source.id)
              .limit(1);

            // Only include if no chunks exist
            if (!existingChunks || existingChunks.length === 0) {
              let status = 'Needs Processing';
              let reason = 'Has content but not processed yet';

              if (processingStatus === 'failed') {
                status = 'Needs Reprocessing';
                reason = 'Previous processing failed, needs retry';
              } else if (!processingStatus) {
                status = 'Needs Processing';
                reason = 'Has content but not processed yet';
              }

              unprocessedSources.push({
                id: source.id,
                title: source.title,
                type: source.source_type,
                reason,
                status
              });
              reasons.push(`${source.source_type.toUpperCase()} "${source.title}" ${reason.toLowerCase()}`);
            }
          }
        }
      }

      const needed = unprocessedSources.length > 0;
      let status: 'up_to_date' | 'needs_processing' | 'needs_reprocessing' | 'no_sources' = 'up_to_date';
      let message = 'All sources are up to date and processed.';

      if (needed) {
        const hasFailedSources = unprocessedSources.some(s => s.status === 'Needs Reprocessing');
        status = hasFailedSources ? 'needs_reprocessing' : 'needs_processing';
        
        const totalUnprocessed = unprocessedSources.reduce((total, source) => {
          return total + (source.unprocessedPagesCount || 1);
        }, 0);

        if (unprocessedSources.some(s => s.type === 'website')) {
          message = `${totalUnprocessed} crawled page${totalUnprocessed > 1 ? 's' : ''} and/or source${totalUnprocessed === 1 ? '' : 's'} need${totalUnprocessed === 1 ? 's' : ''} to be processed for training.`;
        } else {
          message = `${unprocessedSources.length} source${unprocessedSources.length > 1 ? 's' : ''} need${unprocessedSources.length === 1 ? 's' : ''} to be processed for training.`;
        }
      }

      console.log('📋 Retraining check result:', {
        needed,
        unprocessedCount: unprocessedSources.length,
        status,
        message,
        sourceDetails: unprocessedSources.map(s => `${s.type}: ${s.title} (${s.status})`)
      });

      return {
        needed,
        unprocessedSources: unprocessedSources.length,
        reasons,
        status,
        message,
        sourceDetails: unprocessedSources
      };

    } catch (error) {
      console.error('Error in checkRetrainingNeeded:', error);
      return {
        needed: false,
        unprocessedSources: 0,
        reasons: [`Error checking retraining status: ${error instanceof Error ? error.message : 'Unknown error'}`],
        status: 'no_sources',
        message: 'Error checking retraining status.',
        sourceDetails: []
      };
    }
  }
}
