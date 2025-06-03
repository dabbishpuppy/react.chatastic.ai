
import { supabase } from "@/integrations/supabase/client";
import { SemanticChunkingService } from "../semanticChunkingService";
import { EmbeddingGenerator } from "./embeddingGenerator";
import { DatabaseSource } from '../types/retrainingTypes';

export class SourceProcessor {
  static async processSource(source: DatabaseSource): Promise<void> {
    console.log(`📄 Processing source: ${source.title} (type: ${source.source_type})`);

    // Handle Q&A sources with structured content
    let contentToProcess = source.content;
    if (source.source_type === 'qa') {
      const metadata = source.metadata as any;
      if (metadata?.question && metadata?.answer) {
        contentToProcess = `Q: ${metadata.question}\nA: ${metadata.answer}`;
        console.log(`🧩 Q&A content prepared: "${contentToProcess}" (${contentToProcess.length} chars)`);
      }
    }

    // Skip if no content
    if (!contentToProcess || contentToProcess.trim().length === 0) {
      console.log(`⚠️ Skipping source ${source.id} - no content`);
      
      // Update metadata to mark as processed even if no content
      const currentMetadata = source.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        chunks_count: 0,
        last_processed_at: new Date().toISOString(),
        processing_status: 'completed',
        processing_note: 'No content to process'
      };

      await supabase
        .from('agent_sources')
        .update({
          metadata: updatedMetadata
        })
        .eq('id', source.id);

      return;
    }

    try {
      // Delete existing chunks for this source
      await this.deleteExistingChunks(source.id);

      // Create semantic chunks with appropriate settings for each source type
      const chunkingOptions = this.getChunkingOptionsForSourceType(source.source_type);
      console.log(`🔧 Using chunking options for ${source.source_type}:`, chunkingOptions);
      
      const chunks = SemanticChunkingService.createSemanticChunks(contentToProcess, chunkingOptions);

      console.log(`🧩 Created ${chunks.length} chunks for source ${source.id} (${source.source_type})`);
      
      // For Q&A sources with very short content, ensure at least one chunk is created
      if (source.source_type === 'qa' && chunks.length === 0 && contentToProcess.trim().length > 0) {
        console.log(`🔧 Creating forced chunk for short Q&A content: "${contentToProcess}"`);
        
        // Create a minimal chunk manually for very short Q&A content
        const forcedChunk = {
          content: contentToProcess.trim(),
          tokenCount: Math.max(1, Math.ceil(contentToProcess.length / 4)), // Rough token estimate
          chunkIndex: 0,
          metadata: {
            startPosition: 0,
            endPosition: contentToProcess.length,
            sentences: 1,
            semanticBoundary: true,
            contentType: 'paragraph' as const, // Use 'paragraph' instead of 'qa' to match allowed types
            qualityScore: 0.5,
            complexity: 'simple' as const,
            // Add forceCreated as a custom property in metadata
            isForceCreated: true
          }
        };
        
        chunks.push(forcedChunk);
        console.log(`✅ Force-created chunk for Q&A: ${chunks.length} total chunks`);
      }

      // Store chunks in database
      if (chunks.length > 0) {
        const chunkData = chunks.map((chunk, index) => ({
          source_id: source.id,
          chunk_index: index,
          content: chunk.content,
          token_count: chunk.tokenCount,
          metadata: chunk.metadata
        }));

        const { error: insertError } = await supabase
          .from('source_chunks')
          .insert(chunkData);

        if (insertError) {
          throw new Error(`Failed to insert chunks: ${insertError.message}`);
        }

        console.log(`💾 Stored ${chunks.length} chunks in database`);

        // Generate embeddings for chunks
        await EmbeddingGenerator.generateEmbeddings(source.id);
      }

      // Update source status with comprehensive metadata
      const currentMetadata = source.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        chunks_count: chunks.length,
        last_processed_at: new Date().toISOString(),
        processing_status: 'completed',
        source_type_processed: source.source_type,
        embeddings_generated: chunks.length > 0,
        processing_note: chunks.length > 0 ? 'Successfully processed with chunks and embeddings' : 'Processed but no chunks created',
        content_length: contentToProcess.length,
        chunking_strategy: source.source_type === 'qa' && chunks.some(c => c.metadata?.isForceCreated) ? 'force_created' : 'standard'
      };

      await supabase
        .from('agent_sources')
        .update({
          metadata: updatedMetadata
        })
        .eq('id', source.id);

      console.log(`✅ Completed processing source: ${source.title} (${source.source_type}) - ${chunks.length} chunks`);

    } catch (error) {
      console.error(`❌ Failed to process source ${source.id}:`, error);
      
      // Update metadata to mark as failed
      const currentMetadata = source.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        last_processed_at: new Date().toISOString(),
        processing_status: 'failed',
        processing_error: error instanceof Error ? error.message : 'Unknown error',
        source_type_processed: source.source_type
      };

      await supabase
        .from('agent_sources')
        .update({
          metadata: updatedMetadata
        })
        .eq('id', source.id);

      throw error;
    }
  }

  private static getChunkingOptionsForSourceType(sourceType: string) {
    switch (sourceType) {
      case 'qa':
        return {
          targetChunkSize: 200,
          maxChunkSize: 400,
          minChunkSize: 10, // Lowered from 50 to handle very short Q&A pairs
          contentType: sourceType
        };
      case 'text':
        return {
          targetChunkSize: 500,
          maxChunkSize: 1000,
          minChunkSize: 100,
          contentType: sourceType
        };
      case 'file':
        return {
          targetChunkSize: 600,
          maxChunkSize: 1200,
          minChunkSize: 150,
          contentType: sourceType
        };
      case 'website':
        return {
          targetChunkSize: 400,
          maxChunkSize: 800,
          minChunkSize: 100,
          contentType: sourceType
        };
      default:
        return {
          targetChunkSize: 500,
          maxChunkSize: 1000,
          minChunkSize: 100,
          contentType: sourceType
        };
    }
  }

  private static async deleteExistingChunks(sourceId: string): Promise<void> {
    console.log(`🗑️ Deleting existing chunks for source: ${sourceId}`);
    
    // First, get all chunk IDs for this source
    const { data: chunks, error: chunksQueryError } = await supabase
      .from('source_chunks')
      .select('id')
      .eq('source_id', sourceId);

    if (chunksQueryError) {
      throw new Error(`Failed to query existing chunks: ${chunksQueryError.message}`);
    }

    if (chunks && chunks.length > 0) {
      const chunkIds = chunks.map(chunk => chunk.id);

      // Delete embeddings first (foreign key constraint)
      const { error: embeddingError } = await supabase
        .from('source_embeddings')
        .delete()
        .in('chunk_id', chunkIds);

      if (embeddingError) {
        console.warn(`Warning: Failed to delete existing embeddings: ${embeddingError.message}`);
      }

      // Delete chunks
      const { error: chunkError } = await supabase
        .from('source_chunks')
        .delete()
        .eq('source_id', sourceId);

      if (chunkError) {
        throw new Error(`Failed to delete existing chunks: ${chunkError.message}`);
      }

      console.log(`✅ Deleted ${chunks.length} existing chunks and embeddings for source: ${sourceId}`);
    } else {
      console.log(`ℹ️ No existing chunks found for source: ${sourceId}`);
    }
  }
}
