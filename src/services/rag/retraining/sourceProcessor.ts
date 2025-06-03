
import { supabase } from "@/integrations/supabase/client";
import { SemanticChunkingService } from "../semanticChunkingService";
import { EmbeddingGenerator } from "./embeddingGenerator";
import { DatabaseSource } from '../types/retrainingTypes';

export class SourceProcessor {
  static async processSource(source: DatabaseSource): Promise<void> {
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

    // Store chunks in database - removed created_by field
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
    await EmbeddingGenerator.generateEmbeddings(source.id);

    // Update source status
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

  private static async deleteExistingChunks(sourceId: string): Promise<void> {
    const { error } = await supabase
      .from('source_chunks')
      .delete()
      .eq('source_id', sourceId);

    if (error) {
      throw new Error(`Failed to delete existing chunks: ${error.message}`);
    }
  }
}
