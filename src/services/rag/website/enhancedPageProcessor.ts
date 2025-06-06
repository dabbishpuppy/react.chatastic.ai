
import { supabase } from "@/integrations/supabase/client";
import { CompressionEngine } from "../enhanced/compression";

export class EnhancedPageProcessor {
  static async processPageContentAdvanced(
    sourceId: string,
    agentId: string,
    teamId: string,
    url: string,
    htmlContent: string
  ) {
    console.log('🚀 Processing page with advanced compression pipeline:', url);

    try {
      // Extract and clean content
      const textContent = this.extractTextContent(htmlContent);
      
      // Analyze content for optimal processing strategy
      const analysis = CompressionEngine.analyzeContent(textContent);
      console.log('📊 Content analysis:', analysis);

      // Apply advanced compression with content analysis
      const compressionResult = await CompressionEngine.compressWithMaximumEfficiency(
        [textContent], 
        analysis, 
        agentId
      );

      const compressionRatio = compressionResult.compressionRatio;
      const compressionSavings = Math.round((1 - compressionRatio) * 100);
      const compressionStrategy = compressionResult.strategy;

      console.log('🗜️ Advanced compression results:', {
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        ratio: compressionRatio,
        savings: compressionSavings,
        strategy: compressionStrategy
      });

      // Create semantic chunks from compressed content
      const chunks = this.createSemanticChunks(compressionResult.compressedChunks.join(' '));

      // Perform advanced deduplication
      const deduplicationResult = await CompressionEngine.performAdvancedDeduplication(chunks, agentId);

      console.log('🔄 Deduplication results:', {
        originalChunks: chunks.length,
        uniqueChunks: deduplicationResult.uniqueChunks.length,
        duplicatesRemoved: deduplicationResult.duplicatesRemoved,
        sentenceDeduplication: deduplicationResult.sentenceDeduplication,
        compressionRatio: compressionRatio
      });

      // Store chunks with advanced metadata
      await this.storeAdvancedChunks(
        sourceId,
        agentId,
        teamId,
        url,
        deduplicationResult.uniqueChunks,
        {
          originalSize: textContent.length,
          compressedSize: compressionResult.compressedSize,
          compressionRatio: compressionRatio,
          duplicatesRemoved: deduplicationResult.duplicatesRemoved,
          sentenceDeduplication: deduplicationResult.sentenceDeduplication,
          processingMode: analysis.contentType,
          strategy: compressionStrategy
        }
      );

      return {
        chunksCreated: deduplicationResult.uniqueChunks.length,
        originalContentSize: textContent.length,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionRatio,
        duplicatesRemoved: deduplicationResult.duplicatesRemoved,
        processingMode: analysis.contentType
      };

    } catch (error) {
      console.error('❌ Advanced page processing failed:', error);
      throw error;
    }
  }

  private static async storeAdvancedChunks(
    sourceId: string,
    agentId: string,
    teamId: string,
    url: string,
    chunks: string[],
    metadata: {
      originalSize: number;
      compressedSize: number;
      compressionRatio: number;
      duplicatesRemoved: number;
      sentenceDeduplication: number;
      processingMode: string;
      strategy: string;
    }
  ) {
    console.log('💾 Storing advanced chunks with metadata...');

    const chunksToInsert = chunks.map((content, index) => ({
      source_id: sourceId,
      chunk_index: index,
      content: content,
      token_count: Math.ceil(content.length / 4), // Rough token estimation
      metadata: {
        url,
        ...metadata,
        chunkIndex: index
      }
    }));

    const { data, error } = await supabase
      .from('source_chunks')
      .insert(chunksToInsert);

    if (error) {
      console.error('❌ Failed to store chunks:', error);
      throw new Error(`Failed to store chunks: ${error.message}`);
    }

    console.log('✅ Successfully stored chunks with advanced metadata');
    return data;
  }

  private static extractTextContent(htmlContent: string): string {
    // Simple text extraction - remove HTML tags and clean up
    return htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static createSemanticChunks(content: string, maxTokens: number = 500): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (currentChunk.length + trimmedSentence.length > maxTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 20);
  }
}
