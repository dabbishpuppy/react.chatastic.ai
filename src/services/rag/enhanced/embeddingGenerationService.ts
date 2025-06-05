
import { supabase } from "@/integrations/supabase/client";

export interface EmbeddingGenerationResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  totalChunks: number;
  sourceId: string;
  error?: string;
}

export class EmbeddingGenerationService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 2000;
  private static readonly BATCH_SIZE = 10;

  static async generateEmbeddingsForSource(sourceId: string): Promise<EmbeddingGenerationResult> {
    console.log(`🤖 Starting embedding generation for source: ${sourceId}`);
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // First, validate that chunks exist and get their IDs
        const validation = await this.validateSourceChunks(sourceId);
        if (!validation.chunksExist) {
          throw new Error(`No chunks found for source ${sourceId}. Cannot generate embeddings.`);
        }

        console.log(`📄 Found ${validation.totalChunks} chunks for source ${sourceId}`);

        // Check which chunks already have embeddings
        const chunksNeedingEmbeddings = await this.getChunksWithoutEmbeddings(validation.chunkIds);
        
        if (chunksNeedingEmbeddings.length === 0) {
          console.log(`✅ All chunks already have embeddings for source ${sourceId}`);
          return {
            success: true,
            processedCount: validation.totalChunks,
            errorCount: 0,
            totalChunks: validation.totalChunks,
            sourceId
          };
        }

        console.log(`🔄 Generating embeddings for ${chunksNeedingEmbeddings.length} chunks`);

        // Process chunks in batches to avoid overwhelming the system
        const result = await this.processBatchedEmbeddings(sourceId, chunksNeedingEmbeddings);
        
        if (result.success) {
          console.log(`✅ Embedding generation completed for source ${sourceId}: ${result.processedCount}/${result.totalChunks} successful`);
          return result;
        }
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt}/${this.MAX_RETRIES} failed for source ${sourceId}:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * attempt;
          console.log(`⏳ Retrying embedding generation in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      processedCount: 0,
      errorCount: 0,
      totalChunks: 0,
      sourceId,
      error: `Failed to generate embeddings after ${this.MAX_RETRIES} attempts`
    };
  }

  private static async validateSourceChunks(sourceId: string): Promise<{
    chunksExist: boolean;
    totalChunks: number;
    chunkIds: string[];
  }> {
    // First verify the source exists
    const { data: sourceExists, error: sourceError } = await supabase
      .from('agent_sources')
      .select('id')
      .eq('id', sourceId)
      .single();

    if (sourceError || !sourceExists) {
      throw new Error(`Source ${sourceId} does not exist: ${sourceError?.message}`);
    }

    // Get all chunks for this source
    const { data: chunks, error: chunksError } = await supabase
      .from('source_chunks')
      .select('id')
      .eq('source_id', sourceId);

    if (chunksError) {
      throw new Error(`Failed to fetch chunks for source ${sourceId}: ${chunksError.message}`);
    }

    const chunkIds = chunks?.map(c => c.id) || [];
    
    return {
      chunksExist: chunkIds.length > 0,
      totalChunks: chunkIds.length,
      chunkIds
    };
  }

  private static async getChunksWithoutEmbeddings(chunkIds: string[]): Promise<string[]> {
    if (chunkIds.length === 0) return [];

    const { data: chunksWithEmbeddings, error } = await supabase
      .from('source_embeddings')
      .select('chunk_id')
      .in('chunk_id', chunkIds);

    if (error) {
      console.warn('Error checking existing embeddings, proceeding with all chunks:', error);
      return chunkIds;
    }

    const existingEmbeddingChunkIds = new Set(chunksWithEmbeddings?.map(e => e.chunk_id) || []);
    return chunkIds.filter(id => !existingEmbeddingChunkIds.has(id));
  }

  private static async processBatchedEmbeddings(
    sourceId: string,
    chunkIds: string[]
  ): Promise<EmbeddingGenerationResult> {
    let processedCount = 0;
    let errorCount = 0;

    // Process in smaller batches to avoid overwhelming the Edge Function
    for (let i = 0; i < chunkIds.length; i += this.BATCH_SIZE) {
      const batch = chunkIds.slice(i, i + this.BATCH_SIZE);
      
      try {
        console.log(`🔄 Processing embedding batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(chunkIds.length / this.BATCH_SIZE)}`);
        
        const { data, error } = await supabase.functions.invoke('generate-embeddings-batch', {
          body: { 
            sourceId,
            chunkIds: batch
          }
        });

        if (error) {
          console.error(`❌ Batch embedding error:`, error);
          errorCount += batch.length;
          continue;
        }

        if (data?.success) {
          processedCount += data.processedCount || 0;
          errorCount += data.errorCount || 0;
        } else {
          console.error(`❌ Batch embedding failed:`, data?.error);
          errorCount += batch.length;
        }

        // Small delay between batches to avoid rate limiting
        if (i + this.BATCH_SIZE < chunkIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Batch processing error:`, error);
        errorCount += batch.length;
      }
    }

    return {
      success: processedCount > 0,
      processedCount,
      errorCount,
      totalChunks: chunkIds.length,
      sourceId
    };
  }

  static async verifyEmbeddingsIntegrity(sourceId: string): Promise<{
    valid: boolean;
    totalChunks: number;
    chunksWithEmbeddings: number;
    orphanedEmbeddings: number;
  }> {
    // Get all chunks for the source
    const { data: chunks, error: chunksError } = await supabase
      .from('source_chunks')
      .select('id')
      .eq('source_id', sourceId);

    if (chunksError) {
      console.error('Error fetching chunks for integrity check:', chunksError);
      return { valid: false, totalChunks: 0, chunksWithEmbeddings: 0, orphanedEmbeddings: 0 };
    }

    const chunkIds = chunks?.map(c => c.id) || [];

    // Get all embeddings for these chunks
    const { data: embeddings, error: embeddingsError } = await supabase
      .from('source_embeddings')
      .select('chunk_id')
      .in('chunk_id', chunkIds);

    if (embeddingsError) {
      console.error('Error fetching embeddings for integrity check:', embeddingsError);
      return { valid: false, totalChunks: chunkIds.length, chunksWithEmbeddings: 0, orphanedEmbeddings: 0 };
    }

    // Check for orphaned embeddings (embeddings without corresponding chunks)
    const { data: allEmbeddings, error: allEmbeddingsError } = await supabase
      .from('source_embeddings')
      .select('chunk_id, id')
      .not('chunk_id', 'in', `(${chunkIds.join(',')})`);

    const orphanedCount = allEmbeddings?.length || 0;
    
    if (orphanedCount > 0) {
      console.warn(`⚠️ Found ${orphanedCount} orphaned embeddings`);
    }

    return {
      valid: orphanedCount === 0,
      totalChunks: chunkIds.length,
      chunksWithEmbeddings: embeddings?.length || 0,
      orphanedEmbeddings: orphanedCount
    };
  }
}
