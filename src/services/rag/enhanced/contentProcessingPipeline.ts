
import { supabase } from "@/integrations/supabase/client";
import { CompressionEngine } from "./compressionEngine";

export interface ProcessingResult {
  success: boolean;
  contentSize: number;
  compressionRatio: number;
  chunksCreated: number;
  duplicatesFound: number;
  contentHash: string;
  error?: string;
}

interface SemanticChunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
}

export class ContentProcessingPipeline {
  // Extract main content and remove boilerplate
  static extractMainContent(html: string): string {
    // Remove script, style, and navigation elements
    let content = html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<nav[^>]*>.*?<\/nav>/gi, '')
      .replace(/<header[^>]*>.*?<\/header>/gi, '')
      .replace(/<footer[^>]*>.*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>.*?<\/aside>/gi, '')
      .replace(/<form[^>]*>.*?<\/form>/gi, '');

    // Remove common boilerplate patterns
    const boilerplatePatterns = [
      /cookie policy|privacy policy|terms of service/gi,
      /subscribe|newsletter|follow us/gi,
      /click here|read more|learn more/gi,
      /advertisement|sponsored content/gi,
      /share this|social media/gi,
      /copyright|all rights reserved/gi,
    ];

    boilerplatePatterns.forEach(pattern => {
      content = content.replace(pattern, '');
    });

    // Convert to plain text and clean up
    return content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Create semantic chunks with proper token counting
  static createSemanticChunks(content: string, maxTokens: number = 150): SemanticChunk[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const chunks: SemanticChunk[] = [];
    let currentChunk = '';
    let tokenCount = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      // Use more accurate token estimation (roughly 1 token per 3.5 characters for English)
      const sentenceTokens = Math.ceil(sentence.trim().length / 3.5);
      
      if (tokenCount + sentenceTokens > maxTokens && currentChunk) {
        if (currentChunk.trim().length > 30) {
          chunks.push({
            content: currentChunk.trim(),
            tokenCount,
            chunkIndex: chunkIndex++
          });
        }
        currentChunk = sentence;
        tokenCount = sentenceTokens;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
        tokenCount += sentenceTokens;
      }
    }
    
    if (currentChunk.trim().length > 30) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount,
        chunkIndex: chunkIndex++
      });
    }
    
    return chunks.filter(chunk => chunk.content.length > 20);
  }

  // Calculate content hash for deduplication
  static async calculateContentHash(content: string): Promise<string> {
    return await CompressionEngine.generateContentHash(content);
  }

  // Process chunks for global deduplication with real Zstd compression
  static async processChunksWithDeduplication(
    chunks: SemanticChunk[],
    sourceId: string,
    customerId: string
  ): Promise<{
    uniqueChunks: number;
    duplicateChunks: number;
    totalCompressedSize: number;
  }> {
    let uniqueChunks = 0;
    let duplicateChunks = 0;
    let totalCompressedSize = 0;

    console.log(`🔍 Processing ${chunks.length} chunks with real Zstd compression and global deduplication`);

    for (const chunk of chunks) {
      const contentHash = await this.calculateContentHash(chunk.content);
      
      // Check if chunk already exists globally in semantic_chunks table
      const { data: existingChunk, error } = await supabase
        .from('semantic_chunks')
        .select('id, ref_count')
        .eq('content_hash', contentHash)
        .single();

      if (existingChunk && !error) {
        // Chunk exists globally - increment reference count
        await supabase
          .from('semantic_chunks')
          .update({ 
            ref_count: existingChunk.ref_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingChunk.id);

        // Create mapping to existing chunk
        await supabase
          .from('source_to_chunk_map')
          .insert({
            source_id: sourceId,
            chunk_id: existingChunk.id,
            chunk_index: chunk.chunkIndex
          });

        duplicateChunks++;
        console.log(`♻️ Reused existing chunk ${existingChunk.id} (global dedup)`);
      } else {
        // New chunk - compress with real Zstd and store
        const compressionResult = await CompressionEngine.compressForStorage(chunk.content);
        
        // Convert compressed data to bytea format for Postgres
        const compressedBytes = new Uint8Array(
          atob(compressionResult.compressedData).split('').map(char => char.charCodeAt(0))
        );
        
        const { data: newChunk, error: insertError } = await supabase
          .from('semantic_chunks')
          .insert({
            content_hash: contentHash,
            compressed_blob: compressedBytes,
            token_count: chunk.tokenCount,
            ref_count: 1
          })
          .select('id')
          .single();

        if (newChunk && !insertError) {
          // Create mapping to new chunk
          await supabase
            .from('source_to_chunk_map')
            .insert({
              source_id: sourceId,
              chunk_id: newChunk.id,
              chunk_index: chunk.chunkIndex
            });

          uniqueChunks++;
          totalCompressedSize += compressionResult.compressedSize;
          
          console.log(`✨ Created new Zstd compressed chunk ${newChunk.id} (${(compressionResult.compressionRatio * 100).toFixed(1)}% ratio)`);
        } else {
          console.error('Failed to create chunk:', insertError);
        }
      }
    }

    console.log(`📊 Global deduplication results: ${uniqueChunks} unique, ${duplicateChunks} duplicates`);

    return {
      uniqueChunks,
      duplicateChunks,
      totalCompressedSize
    };
  }

  // Complete processing pipeline for a single page with real compression
  static async processPage(
    sourceId: string,
    customerId: string,
    url: string,
    htmlContent: string
  ): Promise<ProcessingResult> {
    try {
      console.log(`🚀 Processing page with real Zstd compression: ${url}`);
      
      // Step 1: Extract main content and remove boilerplate
      const cleanContent = this.extractMainContent(htmlContent);
      const originalSize = cleanContent.length;

      if (cleanContent.length < 100) {
        return {
          success: false,
          error: 'Content too short after cleaning',
          contentSize: originalSize,
          compressionRatio: 1.0,
          chunksCreated: 0,
          duplicatesFound: 0,
          contentHash: ''
        };
      }

      // Step 2: Create semantic chunks with proper token counting
      const chunks = this.createSemanticChunks(cleanContent);
      console.log(`📝 Created ${chunks.length} semantic chunks`);
      
      // Step 3: Process with real Zstd compression and global deduplication
      const dedupeResult = await this.processChunksWithDeduplication(
        chunks,
        sourceId,
        customerId
      );

      // Step 4: Calculate overall content hash
      const contentHash = await this.calculateContentHash(cleanContent);

      // Step 5: Calculate compression ratio
      const compressionRatio = dedupeResult.totalCompressedSize > 0 
        ? dedupeResult.totalCompressedSize / originalSize 
        : 0;

      console.log(`✅ Page processing complete: ${dedupeResult.uniqueChunks + dedupeResult.duplicateChunks} total chunks, ${(compressionRatio * 100).toFixed(1)}% compression ratio`);

      return {
        success: true,
        contentSize: originalSize,
        compressionRatio,
        chunksCreated: dedupeResult.uniqueChunks,
        duplicatesFound: dedupeResult.duplicateChunks,
        contentHash
      };

    } catch (error) {
      console.error('Content processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        contentSize: 0,
        compressionRatio: 1.0,
        chunksCreated: 0,
        duplicatesFound: 0,
        contentHash: ''
      };
    }
  }

  // Cleanup chunks when sources are deleted (decrement ref_count)
  static async cleanupSourceChunks(sourceId: string): Promise<number> {
    try {
      // Get all chunk mappings for this source
      const { data: mappings } = await supabase
        .from('source_to_chunk_map')
        .select('chunk_id')
        .eq('source_id', sourceId);

      if (!mappings || mappings.length === 0) {
        return 0;
      }

      let cleanedCount = 0;

      // Decrement ref_count for each chunk
      for (const mapping of mappings) {
        const { data: chunk } = await supabase
          .from('semantic_chunks')
          .select('ref_count')
          .eq('id', mapping.chunk_id)
          .single();

        if (chunk) {
          const newRefCount = Math.max(0, chunk.ref_count - 1);
          
          if (newRefCount === 0) {
            // Delete chunk if no more references
            await supabase
              .from('semantic_chunks')
              .delete()
              .eq('id', mapping.chunk_id);
            cleanedCount++;
          } else {
            // Update ref_count
            await supabase
              .from('semantic_chunks')
              .update({ 
                ref_count: newRefCount,
                updated_at: new Date().toISOString()
              })
              .eq('id', mapping.chunk_id);
          }
        }
      }

      // Delete all mappings for this source
      await supabase
        .from('source_to_chunk_map')
        .delete()
        .eq('source_id', sourceId);

      console.log(`🧹 Cleaned up ${cleanedCount} orphaned chunks for source ${sourceId}`);
      return cleanedCount;

    } catch (error) {
      console.error('Cleanup failed:', error);
      return 0;
    }
  }
}
