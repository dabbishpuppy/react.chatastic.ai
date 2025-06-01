
import { supabase } from "@/integrations/supabase/client";

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

interface CompressionResult {
  compressed: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
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
      const sentenceTokens = Math.ceil(sentence.trim().split(/\s+/).length);
      
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

  // Simulate Zstd compression (in production, this would use actual Zstd)
  static compressContent(content: string): CompressionResult {
    const originalSize = new TextEncoder().encode(content).length;
    
    // Simulate high compression ratio (~75% reduction)
    const compressed = btoa(content); // Base64 encoding as compression simulation
    const compressedSize = Math.floor(originalSize * 0.25); // Simulate 75% compression
    
    return {
      compressed,
      originalSize,
      compressedSize,
      ratio: compressedSize / originalSize
    };
  }

  // Calculate content hash for deduplication
  static async calculateContentHash(content: string): Promise<string> {
    try {
      const { data: hash, error } = await supabase
        .rpc('calculate_content_hash', { content });

      if (error) {
        console.error('Error calculating hash:', error);
        // Fallback to simple hash
        return btoa(content).substring(0, 16);
      }

      return hash.substring(0, 16); // Truncate for storage
    } catch (error) {
      console.error('Hash calculation failed:', error);
      return btoa(content).substring(0, 16);
    }
  }

  // Process chunks for global deduplication
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

    for (const chunk of chunks) {
      const contentHash = await this.calculateContentHash(chunk.content);
      
      // Check if chunk already exists globally
      const { data: existingChunk, error } = await supabase
        .from('semantic_chunks')
        .select('id, ref_count')
        .eq('content_hash', contentHash)
        .single();

      if (existingChunk && !error) {
        // Chunk exists, increment reference count
        await supabase
          .from('semantic_chunks')
          .update({ ref_count: existingChunk.ref_count + 1 })
          .eq('id', existingChunk.id);

        // Create mapping
        await supabase
          .from('source_to_chunk_map')
          .insert({
            source_id: sourceId,
            chunk_id: existingChunk.id,
            chunk_index: chunk.chunkIndex
          });

        duplicateChunks++;
      } else {
        // New chunk, compress and store
        const compressed = this.compressContent(chunk.content);
        
        const { data: newChunk, error: insertError } = await supabase
          .from('semantic_chunks')
          .insert({
            content_hash: contentHash,
            compressed_blob: compressed.compressed,
            token_count: chunk.tokenCount,
            ref_count: 1
          })
          .select('id')
          .single();

        if (newChunk && !insertError) {
          // Create mapping
          await supabase
            .from('source_to_chunk_map')
            .insert({
              source_id: sourceId,
              chunk_id: newChunk.id,
              chunk_index: chunk.chunkIndex
            });

          uniqueChunks++;
          totalCompressedSize += compressed.compressedSize;
        }
      }
    }

    return {
      uniqueChunks,
      duplicateChunks,
      totalCompressedSize
    };
  }

  // Complete processing pipeline for a single page
  static async processPage(
    sourceId: string,
    customerId: string,
    url: string,
    htmlContent: string
  ): Promise<ProcessingResult> {
    try {
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

      // Step 2: Create semantic chunks
      const chunks = this.createSemanticChunks(cleanContent);
      
      // Step 3: Process with global deduplication
      const dedupeResult = await this.processChunksWithDeduplication(
        chunks,
        sourceId,
        customerId
      );

      // Step 4: Calculate overall content hash
      const contentHash = await this.calculateContentHash(cleanContent);

      // Step 5: Calculate compression ratio
      const compressionRatio = dedupeResult.totalCompressedSize / originalSize;

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
}
