
import { supabase } from "@/integrations/supabase/client";
import { ChunkCreationService } from './chunkCreationService';
import { EmbeddingGenerationService } from './embeddingGenerationService';

export interface SequentialProcessingResult {
  success: boolean;
  sourceId: string;
  chunksCreated: number;
  embeddingsGenerated: number;
  error?: string;
}

export class SequentialProcessingService {
  static async processSourceSequentially(
    sourceId: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<SequentialProcessingResult> {
    console.log(`🔄 Starting sequential processing for source: ${sourceId}`);

    try {
      // Step 1: Create chunks first and wait for completion
      console.log(`📝 Step 1: Creating chunks for source ${sourceId}`);
      const chunkResult = await ChunkCreationService.createChunksForSource(
        sourceId,
        content,
        metadata
      );

      if (!chunkResult.success) {
        return {
          success: false,
          sourceId,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          error: `Chunk creation failed: ${chunkResult.error}`
        };
      }

      console.log(`✅ Step 1 completed: ${chunkResult.chunksCreated} chunks created`);

      // Step 2: Validate chunks exist before proceeding
      console.log(`🔍 Step 2: Validating chunks exist for source ${sourceId}`);
      const validation = await ChunkCreationService.validateChunksExist(sourceId);
      
      if (!validation.exist || validation.count === 0) {
        return {
          success: false,
          sourceId,
          chunksCreated: chunkResult.chunksCreated,
          embeddingsGenerated: 0,
          error: 'Chunks were created but validation failed - chunks not found in database'
        };
      }

      console.log(`✅ Step 2 completed: Validated ${validation.count} chunks exist`);

      // Step 3: Generate embeddings only after chunks are confirmed to exist
      console.log(`🤖 Step 3: Generating embeddings for source ${sourceId}`);
      const embeddingResult = await EmbeddingGenerationService.generateEmbeddingsForSource(sourceId);

      if (!embeddingResult.success) {
        console.warn(`⚠️ Embedding generation failed but chunks were created successfully`);
        return {
          success: true, // Partial success - chunks created
          sourceId,
          chunksCreated: chunkResult.chunksCreated,
          embeddingsGenerated: 0,
          error: `Embeddings failed but chunks created: ${embeddingResult.error}`
        };
      }

      console.log(`✅ Step 3 completed: ${embeddingResult.processedCount} embeddings generated`);

      // Step 4: Final integrity check
      console.log(`🔍 Step 4: Running final integrity check for source ${sourceId}`);
      const integrityCheck = await EmbeddingGenerationService.verifyEmbeddingsIntegrity(sourceId);
      
      if (!integrityCheck.valid && integrityCheck.orphanedEmbeddings > 0) {
        console.warn(`⚠️ Integrity check found ${integrityCheck.orphanedEmbeddings} orphaned embeddings`);
      }

      console.log(`✅ Sequential processing completed for source ${sourceId}`);
      console.log(`📊 Final stats: ${chunkResult.chunksCreated} chunks, ${embeddingResult.processedCount} embeddings`);

      return {
        success: true,
        sourceId,
        chunksCreated: chunkResult.chunksCreated,
        embeddingsGenerated: embeddingResult.processedCount
      };

    } catch (error) {
      console.error(`❌ Sequential processing failed for source ${sourceId}:`, error);
      
      return {
        success: false,
        sourceId,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        error: error instanceof Error ? error.message : 'Unknown error during sequential processing'
      };
    }
  }

  static async cleanupOrphanedEmbeddings(): Promise<{
    success: boolean;
    orphansRemoved: number;
    error?: string;
  }> {
    console.log('🧹 Starting cleanup of orphaned embeddings...');

    try {
      // Find embeddings that reference non-existent chunks
      const { data: orphanedEmbeddings, error: findError } = await supabase
        .from('source_embeddings')
        .select(`
          id,
          chunk_id,
          source_chunks!left(id)
        `)
        .is('source_chunks.id', null);

      if (findError) {
        throw new Error(`Failed to find orphaned embeddings: ${findError.message}`);
      }

      if (!orphanedEmbeddings || orphanedEmbeddings.length === 0) {
        console.log('✅ No orphaned embeddings found');
        return { success: true, orphansRemoved: 0 };
      }

      console.log(`🗑️ Found ${orphanedEmbeddings.length} orphaned embeddings to remove`);

      // Remove orphaned embeddings
      const orphanedIds = orphanedEmbeddings.map(e => e.id);
      const { error: deleteError } = await supabase
        .from('source_embeddings')
        .delete()
        .in('id', orphanedIds);

      if (deleteError) {
        throw new Error(`Failed to delete orphaned embeddings: ${deleteError.message}`);
      }

      console.log(`✅ Successfully removed ${orphanedEmbeddings.length} orphaned embeddings`);

      return {
        success: true,
        orphansRemoved: orphanedEmbeddings.length
      };

    } catch (error) {
      console.error('❌ Failed to cleanup orphaned embeddings:', error);
      return {
        success: false,
        orphansRemoved: 0,
        error: error instanceof Error ? error.message : 'Unknown cleanup error'
      };
    }
  }
}
