import { supabase } from "@/integrations/supabase/client";
import { RetrainingStatus, SourceProcessingStatus } from '../types/retrainingTypes';

export class RetrainingChecker {
  static async checkRetrainingNeeded(agentId: string): Promise<RetrainingStatus> {
    try {
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id, title, content, metadata, source_type, requires_manual_training')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) throw error;

      // If no sources exist
      if (!sources || sources.length === 0) {
        return {
          needed: false,
          unprocessedSources: 0,
          reasons: [],
          status: 'no_sources',
          message: 'No sources found. Add sources to enable AI search capabilities.'
        };
      }

      const needsProcessing = [];
      const needsReprocessing = [];
      const crawledButNotTrained = [];
      const reasons = [];

      for (const source of sources) {
        // Check for crawled but not trained website sources
        if (source.source_type === 'website' && source.requires_manual_training) {
          // Get count of unprocessed pages
          const { data: unprocessedPages, error: pagesError } = await supabase
            .from('source_pages')
            .select('id')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed')
            .eq('processing_status', 'pending');

          if (!pagesError && unprocessedPages && unprocessedPages.length > 0) {
            crawledButNotTrained.push(source);
            reasons.push(`${source.title}: ${unprocessedPages.length} crawled pages need training`);
            continue;
          }
        }

        // Check other source types for processing needs
        const sourcesWithContent = source.content && source.content.trim().length > 0;
        if (sourcesWithContent) {
          const isProcessed = await this.isSourceFullyProcessed(source);
          
          if (!isProcessed.processed) {
            if (isProcessed.hasAttempted) {
              needsReprocessing.push(source);
              reasons.push(`${source.title}: ${isProcessed.reason}`);
            } else {
              needsProcessing.push(source);
              reasons.push(`${source.title}: Never processed`);
            }
          }
        }
      }

      const totalUnprocessed = needsProcessing.length + needsReprocessing.length + crawledButNotTrained.length;

      if (totalUnprocessed === 0) {
        return {
          needed: false,
          unprocessedSources: 0,
          reasons: [],
          status: 'up_to_date',
          message: '✅ Everything is up to date! All sources have been processed and are ready for AI search.'
        };
      }

      // Determine primary action needed
      let status: 'needs_processing' | 'needs_reprocessing' = 'needs_processing';
      let message = '';

      if (crawledButNotTrained.length > 0) {
        // Prioritize crawled but not trained sources
        status = 'needs_processing';
        if (crawledButNotTrained.length === totalUnprocessed) {
          message = `${crawledButNotTrained.length} crawled website${crawledButNotTrained.length > 1 ? 's' : ''} need${crawledButNotTrained.length === 1 ? 's' : ''} training`;
        } else {
          message = `${totalUnprocessed} sources need processing (${crawledButNotTrained.length} crawled websites, ${needsProcessing.length} new, ${needsReprocessing.length} reprocessing)`;
        }
      } else if (needsProcessing.length > 0 && needsReprocessing.length === 0) {
        status = 'needs_processing';
        message = `${needsProcessing.length} source${needsProcessing.length > 1 ? 's' : ''} need${needsProcessing.length === 1 ? 's' : ''} initial processing`;
      } else if (needsProcessing.length === 0 && needsReprocessing.length > 0) {
        status = 'needs_reprocessing';
        message = `${needsReprocessing.length} source${needsReprocessing.length > 1 ? 's' : ''} need${needsReprocessing.length === 1 ? 's' : ''} reprocessing`;
      } else {
        status = 'needs_processing';
        message = `${totalUnprocessed} sources need processing (${needsProcessing.length} new, ${needsReprocessing.length} reprocessing)`;
      }

      return {
        needed: true,
        unprocessedSources: totalUnprocessed,
        reasons,
        status,
        message
      };

    } catch (error) {
      console.error('❌ Error checking retraining status:', error);
      return {
        needed: false,
        unprocessedSources: 0,
        reasons: ['Error checking retraining status'],
        status: 'no_sources',
        message: 'Unable to check processing status. Please try again.'
      };
    }
  }

  private static async isSourceFullyProcessed(source: any): Promise<SourceProcessingStatus> {
    try {
      // Check metadata for processing status
      const metadata = source.metadata || {};
      const processingStatus = metadata.processing_status;

      // If explicitly marked as completed, verify it has chunks and embeddings
      if (processingStatus === 'completed') {
        // Verify chunks exist
        const { data: chunks, error: chunksError } = await supabase
          .from('source_chunks')
          .select('id')
          .eq('source_id', source.id)
          .limit(1);

        if (chunksError) {
          return { 
            processed: false, 
            hasAttempted: true, 
            reason: 'Error checking chunks' 
          };
        }

        if (!chunks || chunks.length === 0) {
          return { 
            processed: false, 
            hasAttempted: true, 
            reason: 'Marked complete but missing chunks' 
          };
        }

        // Verify embeddings exist - simplified approach
        const { data: embeddings, error: embeddingsError } = await supabase
          .from('source_embeddings')
          .select('id')
          .in('chunk_id', chunks.map(chunk => chunk.id))
          .limit(1);

        if (embeddingsError) {
          return { 
            processed: false, 
            hasAttempted: true, 
            reason: 'Error checking embeddings' 
          };
        }

        if (!embeddings || embeddings.length === 0) {
          return { 
            processed: false, 
            hasAttempted: true, 
            reason: 'Missing embeddings' 
          };
        }

        return { processed: true, hasAttempted: true, reason: 'Fully processed' };
      }

      // Check if processing was attempted but failed
      if (processingStatus === 'failed' || processingStatus === 'error') {
        return { 
          processed: false, 
          hasAttempted: true, 
          reason: 'Processing failed' 
        };
      }

      // Check if there are any chunks (indicates some processing attempt)
      const { data: chunks, count } = await supabase
        .from('source_chunks')
        .select('id', { count: 'exact' })
        .eq('source_id', source.id);

      if (count && count > 0) {
        // Has chunks but not marked as complete - might be missing embeddings
        return { 
          processed: false, 
          hasAttempted: true, 
          reason: 'Incomplete processing' 
        };
      }

      // No processing status and no chunks - never processed
      return { 
        processed: false, 
        hasAttempted: false, 
        reason: 'Never processed' 
      };

    } catch (error) {
      console.error('Error checking source processing status:', error);
      return { 
        processed: false, 
        hasAttempted: true, 
        reason: 'Error checking status' 
      };
    }
  }
}
