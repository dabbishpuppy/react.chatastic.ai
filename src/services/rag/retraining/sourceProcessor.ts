
import { SemanticChunkingService } from "../semanticChunkingService";
import { EmbeddingGenerator } from "./embeddingGenerator";
import { DatabaseSource } from '../types/retrainingTypes';
import { ChunkingOptionsProvider } from './chunkingOptionsProvider';
import { ContentPreprocessor } from './contentPreprocessor';
import { ChunkManager } from './chunkManager';
import { QAChunkForcer } from './qaChunkForcer';
import { MetadataUpdater } from './metadataUpdater';

export class SourceProcessor {
  static async processSource(source: DatabaseSource): Promise<void> {
    console.log(`📄 Processing source: ${source.title} (type: ${source.source_type})`);

    // Prepare content for processing
    const contentToProcess = ContentPreprocessor.prepareContentForProcessing(source);

    // Skip if no content
    if (ContentPreprocessor.shouldSkipProcessing(contentToProcess)) {
      console.log(`⚠️ Skipping source ${source.id} - no content`);
      await MetadataUpdater.updateSourceMetadataForSkipped(source.id, source.metadata || {});
      return;
    }

    try {
      // Delete existing chunks for this source
      await ChunkManager.deleteExistingChunks(source.id);

      // Create semantic chunks with appropriate settings for each source type
      const chunkingOptions = ChunkingOptionsProvider.getChunkingOptionsForSourceType(source.source_type);
      console.log(`🔧 Using chunking options for ${source.source_type}:`, chunkingOptions);
      
      let chunks = SemanticChunkingService.createSemanticChunks(contentToProcess!, chunkingOptions);

      console.log(`🧩 Created ${chunks.length} chunks for source ${source.id} (${source.source_type})`);
      
      // Handle forced chunk creation for Q&A sources
      chunks = QAChunkForcer.createForcedChunkIfNeeded(source.source_type, chunks, contentToProcess!);

      // Store chunks in database
      await ChunkManager.storeChunks(source.id, chunks);

      // Generate embeddings for chunks
      if (chunks.length > 0) {
        await EmbeddingGenerator.generateEmbeddings(source.id);
      }

      // Update source status with comprehensive metadata
      await MetadataUpdater.updateSourceMetadataForSuccess(
        source.id,
        source.metadata || {},
        chunks,
        source.source_type,
        contentToProcess!.length
      );

      console.log(`✅ Completed processing source: ${source.title} (${source.source_type}) - ${chunks.length} chunks`);

    } catch (error) {
      console.error(`❌ Failed to process source ${source.id}:`, error);
      
      // Update metadata to mark as failed
      await MetadataUpdater.updateSourceMetadataForFailure(
        source.id,
        source.metadata || {},
        source.source_type,
        error
      );

      throw error;
    }
  }
}
