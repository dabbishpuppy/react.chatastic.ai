
import { supabase } from "@/integrations/supabase/client";

export interface ChunkCreationResult {
  success: boolean;
  chunksCreated: number;
  sourceId: string;
  error?: string;
}

export class ChunkCreationService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 1000;

  static async createChunksForSource(
    sourceId: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<ChunkCreationResult> {
    console.log(`🔄 Creating chunks for source: ${sourceId}`);
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await this.attemptChunkCreation(sourceId, content, metadata);
        if (result.success) {
          console.log(`✅ Successfully created ${result.chunksCreated} chunks for source ${sourceId}`);
          return result;
        }
      } catch (error) {
        console.error(`❌ Attempt ${attempt}/${this.MAX_RETRIES} failed for source ${sourceId}:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * attempt;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      chunksCreated: 0,
      sourceId,
      error: `Failed to create chunks after ${this.MAX_RETRIES} attempts`
    };
  }

  private static async attemptChunkCreation(
    sourceId: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<ChunkCreationResult> {
    // Verify source exists first
    const { data: sourceExists, error: sourceError } = await supabase
      .from('agent_sources')
      .select('id')
      .eq('id', sourceId)
      .single();

    if (sourceError || !sourceExists) {
      throw new Error(`Source ${sourceId} does not exist or is inaccessible: ${sourceError?.message}`);
    }

    // Create semantic chunks
    const chunks = this.createSemanticChunks(content);
    
    if (chunks.length === 0) {
      return {
        success: true,
        chunksCreated: 0,
        sourceId,
        error: 'No meaningful chunks could be created from content'
      };
    }

    // Use a transaction to ensure atomicity
    const { data: insertedChunks, error: insertError } = await supabase.rpc(
      'create_chunks_transaction',
      {
        p_source_id: sourceId,
        p_chunks: chunks.map((chunk, index) => ({
          chunk_index: index,
          content: chunk,
          token_count: Math.ceil(chunk.length / 4),
          metadata: {
            ...metadata,
            created_method: 'semantic_chunking',
            created_at: new Date().toISOString()
          }
        }))
      }
    );

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    return {
      success: true,
      chunksCreated: chunks.length,
      sourceId
    };
  }

  private static createSemanticChunks(content: string, maxTokens: number = 150): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const chunks: string[] = [];
    let currentChunk = '';
    let tokenCount = 0;

    for (const sentence of sentences) {
      const sentenceTokens = sentence.trim().split(/\s+/).length;
      
      if (tokenCount + sentenceTokens > maxTokens && currentChunk) {
        if (currentChunk.trim().length > 30) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
        tokenCount = sentenceTokens;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
        tokenCount += sentenceTokens;
      }
    }
    
    if (currentChunk.trim().length > 30) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 20);
  }

  static async validateChunksExist(sourceId: string): Promise<{
    exist: boolean;
    count: number;
    chunkIds: string[];
  }> {
    const { data: chunks, error } = await supabase
      .from('source_chunks')
      .select('id')
      .eq('source_id', sourceId);

    if (error) {
      console.error('Error validating chunks:', error);
      return { exist: false, count: 0, chunkIds: [] };
    }

    return {
      exist: (chunks?.length || 0) > 0,
      count: chunks?.length || 0,
      chunkIds: chunks?.map(c => c.id) || []
    };
  }
}
