
import { supabase } from "@/integrations/supabase/client";
import { AgentSource, SourceChunk } from "@/types/rag";
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
        .select('*')
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

          await this.processSource(source);
          
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
  private static async processSource(source: AgentSource): Promise<void> {
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

    // Store chunks in database
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

    // Update source status
    await supabase
      .from('agent_sources')
      .update({
        metadata: {
          ...source.metadata,
          chunks_count: chunks.length,
          last_processed_at: new Date().toISOString(),
          processing_status: 'completed'
        }
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

  // Check if retraining is needed
  static async checkRetrainingNeeded(agentId: string): Promise<{
    needed: boolean;
    unprocessedSources: number;
    reasons: string[];
  }> {
    const { data: sources, error } = await supabase
      .from('agent_sources')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true);

    if (error) throw error;

    const unprocessedSources = (sources || []).filter(source => {
      const hasContent = source.content && source.content.trim().length > 0;
      const isProcessed = source.metadata?.processing_status === 'completed';
      return hasContent && !isProcessed;
    });

    const reasons: string[] = [];
    if (unprocessedSources.length > 0) {
      reasons.push(`${unprocessedSources.length} sources need processing`);
    }

    return {
      needed: unprocessedSources.length > 0,
      unprocessedSources: unprocessedSources.length,
      reasons
    };
  }
}
