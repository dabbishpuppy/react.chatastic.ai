
import { supabase } from "@/integrations/supabase/client";

export interface ChunkingOptions {
  maxTokens?: number;
  overlapTokens?: number;
  preserveParagraphs?: boolean;
  minChunkSize?: number;
  contentType?: 'text' | 'code' | 'markdown' | 'html';
}

export interface Chunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
  metadata: {
    startOffset: number;
    endOffset: number;
    contentType: string;
    heading?: string;
    section?: string;
  };
}

export interface ChunkingResult {
  chunks: Chunk[];
  totalTokens: number;
  duplicatesFound: number;
  compressionRatio: number;
}

export class SemanticChunker {
  private static readonly DEFAULT_OPTIONS: Required<ChunkingOptions> = {
    maxTokens: 500,
    overlapTokens: 50,
    preserveParagraphs: true,
    minChunkSize: 100,
    contentType: 'text'
  };

  /**
   * Chunk text into semantic segments
   */
  static async chunkText(text: string, options: ChunkingOptions = {}): Promise<ChunkingResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    console.log(`🔪 Chunking text (${text.length} chars) with options:`, opts);

    try {
      // Preprocess text based on content type
      const preprocessedText = this.preprocessText(text, opts.contentType);
      
      // Split into initial segments
      const segments = this.splitIntoSegments(preprocessedText, opts);
      
      // Create chunks with overlap
      const chunks = this.createChunksWithOverlap(segments, opts);
      
      // Calculate metrics
      const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
      const duplicatesFound = await this.findDuplicates(chunks);
      const compressionRatio = text.length > 0 ? totalTokens / text.length : 0;

      console.log(`✅ Created ${chunks.length} chunks (${totalTokens} tokens, ${duplicatesFound} duplicates)`);

      return {
        chunks,
        totalTokens,
        duplicatesFound,
        compressionRatio
      };

    } catch (error) {
      console.error('❌ Text chunking failed:', error);
      throw new Error(`Chunking failed: ${error}`);
    }
  }

  private static preprocessText(text: string, contentType: string): string {
    let processed = text;

    switch (contentType) {
      case 'html':
        // Remove HTML tags but preserve structure
        processed = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ');
        break;
        
      case 'markdown':
        // Preserve markdown structure
        processed = text
          .replace(/```[\s\S]*?```/g, (match) => match.replace(/\n/g, ' ')) // Preserve code blocks
          .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines
        break;
        
      case 'code':
        // Preserve code structure and comments
        processed = text; // Keep as-is for code
        break;
        
      default:
        // Basic text cleanup
        processed = text
          .replace(/\s+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
    }

    return processed;
  }

  private static splitIntoSegments(text: string, options: Required<ChunkingOptions>): string[] {
    const segments: string[] = [];

    if (options.preserveParagraphs && options.contentType !== 'code') {
      // Split by paragraphs first
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      for (const paragraph of paragraphs) {
        if (this.estimateTokens(paragraph) <= options.maxTokens) {
          segments.push(paragraph);
        } else {
          // Split large paragraphs by sentences
          const sentences = this.splitBySentences(paragraph);
          segments.push(...sentences);
        }
      }
    } else {
      // Split by fixed token size
      segments.push(...this.splitByTokenSize(text, options.maxTokens));
    }

    return segments.filter(segment => segment.trim().length >= options.minChunkSize);
  }

  private static splitBySentences(text: string): string[] {
    // Simple sentence splitting - can be enhanced with NLP libraries
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.map(s => s.trim() + '.');
  }

  private static splitByTokenSize(text: string, maxTokens: number): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    let currentChunk = '';
    let currentTokens = 0;

    for (const word of words) {
      const wordTokens = this.estimateTokens(word);
      
      if (currentTokens + wordTokens > maxTokens && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
        currentTokens = wordTokens;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word;
        currentTokens += wordTokens;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private static createChunksWithOverlap(segments: string[], options: Required<ChunkingOptions>): Chunk[] {
    const chunks: Chunk[] = [];
    let globalOffset = 0;

    for (let i = 0; i < segments.length; i++) {
      let chunkContent = segments[i];
      let startOffset = globalOffset;

      // Add overlap from previous chunk
      if (i > 0 && options.overlapTokens > 0) {
        const prevChunk = segments[i - 1];
        const overlapText = this.getOverlapText(prevChunk, options.overlapTokens);
        chunkContent = overlapText + ' ' + chunkContent;
      }

      // Add overlap to next chunk
      if (i < segments.length - 1 && options.overlapTokens > 0) {
        const nextChunk = segments[i + 1];
        const overlapText = this.getOverlapText(nextChunk, options.overlapTokens);
        chunkContent = chunkContent + ' ' + overlapText;
      }

      const tokenCount = this.estimateTokens(chunkContent);
      const endOffset = globalOffset + segments[i].length;

      chunks.push({
        content: chunkContent.trim(),
        tokenCount,
        chunkIndex: i,
        metadata: {
          startOffset,
          endOffset,
          contentType: options.contentType,
          heading: this.extractHeading(segments[i]),
          section: `chunk_${i}`
        }
      });

      globalOffset = endOffset;
    }

    return chunks;
  }

  private static getOverlapText(text: string, overlapTokens: number): string {
    const words = text.split(/\s+/);
    const overlapWords = words.slice(-Math.min(overlapTokens, words.length / 2));
    return overlapWords.join(' ');
  }

  private static extractHeading(text: string): string | undefined {
    // Extract heading from markdown or first line
    const lines = text.split('\n');
    const firstLine = lines[0].trim();
    
    if (firstLine.startsWith('#')) {
      return firstLine.replace(/^#+\s*/, '');
    }
    
    if (firstLine.length < 100 && firstLine.endsWith(':')) {
      return firstLine.slice(0, -1);
    }
    
    return undefined;
  }

  private static estimateTokens(text: string): number {
    // Rough token estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private static async findDuplicates(chunks: Chunk[]): Promise<number> {
    try {
      // Check against existing chunks in database
      const contentHashes = chunks.map(chunk => this.hashContent(chunk.content));
      
      const { data: existingChunks } = await supabase
        .from('source_chunks')
        .select('content_hash')
        .in('content_hash', contentHashes);

      const existingHashes = new Set((existingChunks || []).map(c => c.content_hash));
      return chunks.filter(chunk => existingHashes.has(this.hashContent(chunk.content))).length;

    } catch (error) {
      console.error('❌ Error checking for duplicates:', error);
      return 0;
    }
  }

  private static hashContent(content: string): string {
    // Simple hash function - could use crypto.subtle.digest in production
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Chunk different content types with optimized settings
   */
  static async chunkByContentType(text: string, contentType: 'text' | 'code' | 'markdown' | 'html'): Promise<ChunkingResult> {
    const typeSpecificOptions: Record<string, ChunkingOptions> = {
      text: { maxTokens: 500, overlapTokens: 50, preserveParagraphs: true },
      code: { maxTokens: 800, overlapTokens: 100, preserveParagraphs: false },
      markdown: { maxTokens: 600, overlapTokens: 75, preserveParagraphs: true },
      html: { maxTokens: 400, overlapTokens: 40, preserveParagraphs: true }
    };

    return this.chunkText(text, { ...typeSpecificOptions[contentType], contentType });
  }
}
