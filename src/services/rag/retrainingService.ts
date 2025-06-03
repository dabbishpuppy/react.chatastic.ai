
import { supabase } from "@/integrations/supabase/client";
import { SemanticChunkingService } from "./semanticChunkingService";

export interface RetrainingProgress {
  totalSources: number;
  processedSources: number;
  totalChunks: number;
  processedChunks: number;
  currentSource?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Define the source type we expect from the database
interface DatabaseSource {
  id: string;
  title: string;
  content: string | null;
  source_type: string;
  metadata: any; // This will be Json from Supabase
}

export class RetrainingService {
  private static progressCallbacks = new Map<string, (progress: RetrainingProgress) => void>();

  // Start retraining for an agent
  static async retrainAgent(
    agentId: string, 
    onProgress?: (progress: RetrainingProgress) => void
  ): Promise<boolean> {
    console.log('🚀 Starting agent retraining for:', agentId);

    if (onProgress) {
      this.progressCallbacks.set(agentId, onProgress);
    }

    try {
      // Get all sources for the agent
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id, title, content, source_type, metadata')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (error) throw error;

      const progress: RetrainingProgress = {
        totalSources: sources?.length || 0,
        processedSources: 0,
        totalChunks: 0,
        processedChunks: 0,
        status: 'processing'
      };

      this.updateProgress(agentId, progress);

      // Process each source
      for (const source of sources || []) {
        try {
          progress.currentSource = source.title;
          this.updateProgress(agentId, progress);

          await this.processSource(source as DatabaseSource);
          
          progress.processedSources++;
          this.updateProgress(agentId, progress);
        } catch (error) {
          console.error(`❌ Failed to process source ${source.id}:`, error);
          // Continue with other sources even if one fails
        }
      }

      progress.status = 'completed';
      progress.currentSource = undefined;
      this.updateProgress(agentId, progress);

      console.log('✅ Agent retraining completed');
      return true;

    } catch (error) {
      console.error('❌ Agent retraining failed:', error);
      
      const errorProgress: RetrainingProgress = {
        totalSources: 0,
        processedSources: 0,
        totalChunks: 0,
        processedChunks: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.updateProgress(agentId, errorProgress);
      return false;
    } finally {
      this.progressCallbacks.delete(agentId);
    }
  }

  // Process a single source
  private static async processSource(source: DatabaseSource): Promise<void> {
    console.log(`📄 Processing source: ${source.title}`);

    // Skip if no content
    if (!source.content || source.content.trim().length === 0) {
      console.log(`⚠️ Skipping source ${source.id} - no content`);
      return;
    }

    // Delete existing chunks for this source
    await this.deleteExistingChunks(source.id);

    // Create semantic chunks
    const chunks = SemanticChunkingService.createSemanticChunks(source.content, {
      targetChunkSize: 500,
      maxChunkSize: 1000,
      minChunkSize: 100,
      contentType: source.source_type
    });

    console.log(`🧩 Created ${chunks.length} chunks for source ${source.id}`);

    // Store chunks in database - only include fields that exist in the table
    const chunkData = chunks.map((chunk, index) => ({
      source_id: source.id,
      chunk_index: index,
      content: chunk.content,
      token_count: chunk.tokenCount,
      metadata: chunk.metadata
    }));

    if (chunkData.length > 0) {
      const { error: insertError } = await supabase
        .from('source_chunks')
        .insert(chunkData);

      if (insertError) {
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }
    }

    // Generate embeddings for chunks
    await this.generateEmbeddings(source.id);

    // Update source status - properly handle metadata type
    const currentMetadata = source.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      chunks_count: chunks.length,
      last_processed_at: new Date().toISOString(),
      processing_status: 'completed'
    };

    await supabase
      .from('agent_sources')
      .update({
        metadata: updatedMetadata
      })
      .eq('id', source.id);

    console.log(`✅ Completed processing source: ${source.title}`);
  }

  // Delete existing chunks for a source
  private static async deleteExistingChunks(sourceId: string): Promise<void> {
    const { error } = await supabase
      .from('source_chunks')
      .delete()
      .eq('source_id', sourceId);

    if (error) {
      throw new Error(`Failed to delete existing chunks: ${error.message}`);
    }
  }

  // Generate embeddings for source chunks
  private static async generateEmbeddings(sourceId: string): Promise<void> {
    console.log(`🤖 Generating embeddings for source: ${sourceId}`);

    // Get chunks for this source
    const { data: chunks, error } = await supabase
      .from('source_chunks')
      .select('*')
      .eq('source_id', sourceId);

    if (error) throw error;

    // Generate embeddings using OpenAI
    for (const chunk of chunks || []) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'your-api-key-here'}`
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: chunk.content
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;

        // Store embedding
        await supabase
          .from('source_embeddings')
          .upsert({
            chunk_id: chunk.id,
            embedding: JSON.stringify(embedding),
            model: 'text-embedding-3-small'
          });

      } catch (error) {
        console.error(`❌ Failed to generate embedding for chunk ${chunk.id}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    console.log(`✅ Generated embeddings for source: ${sourceId}`);
  }

  // Update progress and notify callback
  private static updateProgress(agentId: string, progress: RetrainingProgress): void {
    const callback = this.progressCallbacks.get(agentId);
    if (callback) {
      callback(progress);
    }
  }

  // Enhanced check if retraining is needed with better logic
  static async checkRetrainingNeeded(agentId: string): Promise<{
    needed: boolean;
    unprocessedSources: number;
    reasons: string[];
    status: 'up_to_date' | 'needs_processing' | 'needs_reprocessing' | 'no_sources';
    message: string;
  }> {
    try {
      const { data: sources, error } = await supabase
        .from('agent_sources')
        .select('id, title, content, metadata, source_type')
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

      const sourcesWithContent = sources.filter(source => 
        source.content && source.content.trim().length > 0
      );

      // If no sources have content
      if (sourcesWithContent.length === 0) {
        return {
          needed: false,
          unprocessedSources: 0,
          reasons: [],
          status: 'no_sources',
          message: 'No sources with content found. Add content to your sources to enable AI search.'
        };
      }

      const needsProcessing = [];
      const needsReprocessing = [];
      const reasons = [];

      for (const source of sourcesWithContent) {
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

      const totalUnprocessed = needsProcessing.length + needsReprocessing.length;

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

      if (needsProcessing.length > 0 && needsReprocessing.length === 0) {
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

  // Check if a source is fully processed
  private static async isSourceFullyProcessed(source: any): Promise<{
    processed: boolean;
    hasAttempted: boolean;
    reason: string;
  }> {
    try {
      // Check metadata for processing status
      const metadata = source.metadata || {};
      const processingStatus = metadata.processing_status;
      const chunksCount = metadata.chunks_count;

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
