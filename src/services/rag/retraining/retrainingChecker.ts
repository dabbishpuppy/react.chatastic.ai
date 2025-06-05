
import { supabase } from "@/integrations/supabase/client";
import { RetrainingStatus } from '../types/retrainingTypes';

export class RetrainingChecker {
  static async checkRetrainingNeeded(agentId: string): Promise<RetrainingStatus> {
    try {
      console.log('🔍 ENHANCED: Checking retraining status for agent:', agentId);

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

      // Check each source with enhanced logic - focus on chunk existence
      for (const source of sources) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          // ENHANCED: For website sources, check ALL pages, not just completed ones
          const { data: crawledPages, error: pagesError } = await supabase
            .from('source_pages')
            .select('id, url, status, processing_status, created_at')
            .eq('parent_source_id', source.id);

          if (pagesError) {
            console.error('Error checking source pages:', pagesError);
            continue;
          }

          if (crawledPages && crawledPages.length > 0) {
            // ENHANCED: Focus purely on chunk existence, not processing status
            let needsProcessingCount = 0;
            
            for (const page of crawledPages) {
              // Only check completed pages for chunks
              if (page.status === 'completed') {
                // Check if chunks exist for this page
                const { data: existingChunks } = await supabase
                  .from('source_chunks')
                  .select('id')
                  .eq('source_id', page.id)
                  .limit(1);

                // ENHANCED: If no chunks exist, this page needs training
                const hasNoChunks = !existingChunks || existingChunks.length === 0;

                if (hasNoChunks) {
                  needsProcessingCount++;
                  console.log(`🔍 Page ${page.url} has no chunks - needs training`);
                }
              }
            }

            if (needsProcessingCount > 0) {
              unprocessedSources.push({
                id: source.id,
                title: source.title,
                type: 'website',
                reason: `${needsProcessingCount} crawled page${needsProcessingCount > 1 ? 's' : ''} need${needsProcessingCount === 1 ? 's' : ''} training`,
                status: 'Crawled - Needs Training',
                unprocessedPagesCount: needsProcessingCount
              });
              reasons.push(`Website "${source.title}" has ${needsProcessingCount} pages that need training`);
              console.log(`🟡 ENHANCED: Website "${source.title}" needs training - ${needsProcessingCount} unprocessed pages`);
            } else {
              console.log(`✅ ENHANCED: Website "${source.title}" is fully trained`);
            }
          }
        } else {
          // ENHANCED: For other source types, check chunks existence more reliably
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          if (hasContent) {
            // Check if chunks exist for this source
            const { data: existingChunks } = await supabase
              .from('source_chunks')
              .select('id')
              .eq('source_id', source.id)
              .limit(1);

            const hasNoChunks = !existingChunks || existingChunks.length === 0;

            // ENHANCED: If no chunks exist, this source needs training regardless of status
            if (hasNoChunks) {
              let status = 'Needs Training';
              let reason = 'Content available but no training chunks created yet';

              unprocessedSources.push({
                id: source.id,
                title: source.title,
                type: source.source_type,
                reason,
                status
              });
              reasons.push(`${source.source_type.toUpperCase()} "${source.title}" ${reason.toLowerCase()}`);
              console.log(`🟡 ENHANCED: Source "${source.title}" needs training - ${reason}`);
            } else {
              console.log(`✅ ENHANCED: Source "${source.title}" is fully trained`);
            }
          }
        }
      }

      const needed = unprocessedSources.length > 0;
      let status: 'up_to_date' | 'needs_processing' | 'needs_reprocessing' | 'no_sources' = 'up_to_date';
      let message = 'All sources are up to date and trained.';

      if (needed) {
        status = 'needs_processing';
        
        const totalUnprocessed = unprocessedSources.reduce((total, source) => {
          return total + (source.unprocessedPagesCount || 1);
        }, 0);

        if (unprocessedSources.some(s => s.type === 'website')) {
          message = `${totalUnprocessed} crawled page${totalUnprocessed > 1 ? 's' : ''} and/or source${totalUnprocessed === 1 ? '' : 's'} need${totalUnprocessed === 1 ? 's' : ''} to be processed for training.`;
        } else {
          message = `${unprocessedSources.length} source${unprocessedSources.length > 1 ? 's' : ''} need${unprocessedSources.length === 1 ? 's' : ''} to be processed for training.`;
        }
      }

      console.log('📋 ENHANCED Retraining check result:', {
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
      console.error('Error in ENHANCED checkRetrainingNeeded:', error);
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
