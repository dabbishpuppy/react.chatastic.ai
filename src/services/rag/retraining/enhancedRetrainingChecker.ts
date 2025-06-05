
import { supabase } from "@/integrations/supabase/client";

export interface EnhancedRetrainingStatus {
  needed: boolean;
  unprocessedSources: number;
  reasons: string[];
  status: 'up_to_date' | 'needs_processing' | 'needs_reprocessing' | 'has_failures' | 'no_sources';
  message: string;
  sourceDetails: Array<{
    id: string;
    title: string;
    type: string;
    reason: string;
    status: string;
    canRetry?: boolean;
    errorMessage?: string;
    unprocessedPagesCount?: number;
  }>;
}

export class EnhancedRetrainingChecker {
  /**
   * Enhanced retraining checker with comprehensive error handling and retry support
   * Phase 2: Enhanced Error Handling for Failed Sources
   * Phase 6: Enhanced Retraining Detection Logic (chunk-based)
   */
  static async checkRetrainingNeeded(agentId: string): Promise<EnhancedRetrainingStatus> {
    try {
      console.log('🔍 ENHANCED: Checking retraining status with chunk-based detection for agent:', agentId);

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
      let hasFailures = false;

      // Process each source type with enhanced error handling
      for (const source of sources) {
        const metadata = (source.metadata as Record<string, any>) || {};
        
        if (source.source_type === 'website') {
          // ENHANCED: Check website sources - focus on chunk existence for completed pages
          const { data: crawledPages, error: pagesError } = await supabase
            .from('source_pages')
            .select('id, url, status, processing_status, created_at, error_message')
            .eq('parent_source_id', source.id);

          if (pagesError) {
            console.error('Error checking source pages:', pagesError);
            continue;
          }

          if (crawledPages && crawledPages.length > 0) {
            let needsProcessingCount = 0;
            let failedPagesCount = 0;
            
            for (const page of crawledPages) {
              // Phase 2: Handle failed pages as retriable items
              if (page.status === 'failed') {
                failedPagesCount++;
                hasFailures = true;
                console.log(`💥 Page ${page.url} failed - can be retried`);
              } else if (page.status === 'completed') {
                // Phase 6: Check if chunks exist for this completed page
                const { data: existingChunks } = await supabase
                  .from('source_chunks')
                  .select('id')
                  .eq('source_id', page.id)
                  .limit(1);

                const hasNoChunks = !existingChunks || existingChunks.length === 0;

                if (hasNoChunks) {
                  needsProcessingCount++;
                  console.log(`🔍 Page ${page.url} has no chunks - needs training`);
                }
              }
            }

            // Add failed pages to unprocessed list with retry option
            if (failedPagesCount > 0) {
              unprocessedSources.push({
                id: source.id,
                title: source.title,
                type: 'website',
                reason: `${failedPagesCount} page${failedPagesCount > 1 ? 's' : ''} failed to crawl`,
                status: 'Failed to fetch',
                canRetry: true,
                unprocessedPagesCount: failedPagesCount
              });
              reasons.push(`Website "${source.title}" has ${failedPagesCount} failed pages that can be retried`);
            }

            // Add pages needing training
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
            }

            if (needsProcessingCount === 0 && failedPagesCount === 0) {
              console.log(`✅ ENHANCED: Website "${source.title}" is fully trained`);
            }
          }
        } else {
          // Phase 6: Handle other source types with chunk-based detection
          const hasContent = source.source_type === 'qa' ? 
            (metadata?.question && metadata?.answer) :
            source.content && source.content.trim().length > 0;

          if (hasContent) {
            // Phase 2: Check for processing failures first
            if (metadata.processing_status === 'failed') {
              hasFailures = true;
              unprocessedSources.push({
                id: source.id,
                title: source.title,
                type: source.source_type,
                reason: 'Processing failed during chunking',
                status: 'Chunking error',
                canRetry: true,
                errorMessage: metadata.error_message || 'Unknown error during processing'
              });
              reasons.push(`${source.source_type.toUpperCase()} "${source.title}" failed to process and can be retried`);
              continue;
            }

            // Phase 6: Check if chunks exist for this source (most important check)
            const { data: existingChunks } = await supabase
              .from('source_chunks')
              .select('id')
              .eq('source_id', source.id)
              .limit(1);

            const hasNoChunks = !existingChunks || existingChunks.length === 0;

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
      let status: 'up_to_date' | 'needs_processing' | 'needs_reprocessing' | 'has_failures' | 'no_sources' = 'up_to_date';
      let message = 'All sources are up to date and trained.';

      if (needed) {
        if (hasFailures) {
          status = 'has_failures';
          message = `${unprocessedSources.length} source${unprocessedSources.length > 1 ? 's' : ''} need${unprocessedSources.length === 1 ? 's' : ''} attention. Some items failed and can be retried.`;
        } else {
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
      }

      console.log('📋 ENHANCED Retraining check result:', {
        needed,
        unprocessedCount: unprocessedSources.length,
        status,
        message,
        hasFailures,
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

  /**
   * Phase 2: Retry failed sources or pages
   */
  static async retryFailedSource(sourceId: string, sourceType: string): Promise<boolean> {
    try {
      console.log(`🔄 Retrying failed source: ${sourceId} (${sourceType})`);
      
      if (sourceType === 'website') {
        // Reset failed pages to pending for retry
        const { error } = await supabase
          .from('source_pages')
          .update({ 
            status: 'pending',
            processing_status: null,
            error_message: null,
            retry_count: 0
          })
          .eq('parent_source_id', sourceId)
          .eq('status', 'failed');

        if (error) throw error;
      } else {
        // Reset failed source to allow reprocessing
        const { error } = await supabase
          .from('agent_sources')
          .update({
            metadata: {
              processing_status: 'pending',
              last_retry_attempt: new Date().toISOString(),
              error_message: null
            }
          })
          .eq('id', sourceId);

        if (error) throw error;
      }

      console.log(`✅ Successfully reset failed source ${sourceId} for retry`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to retry source ${sourceId}:`, error);
      return false;
    }
  }
}
