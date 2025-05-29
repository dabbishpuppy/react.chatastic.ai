
export interface SemanticChunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
  metadata: {
    startPosition: number;
    endPosition: number;
    sentences: number;
    semanticBoundary: boolean;
  };
}

export class SemanticChunkingService {
  private static readonly TARGET_CHUNK_SIZE = 500; // tokens
  private static readonly MAX_CHUNK_SIZE = 750; // tokens
  private static readonly MIN_CHUNK_SIZE = 100; // tokens
  private static readonly OVERLAP_SIZE = 50; // tokens

  // Rough token estimation (1 token ≈ 4 characters for English)
  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Split text into semantic chunks
  static createSemanticChunks(content: string): SemanticChunk[] {
    if (!content || content.length === 0) {
      return [];
    }

    const chunks: SemanticChunk[] = [];
    
    // First, split by paragraphs to preserve semantic boundaries
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length === 0) {
      // Fallback to sentence splitting
      return this.chunkBySentences(content);
    }

    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;
    let position = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      const paragraphTokens = this.estimateTokens(paragraph);

      // If this paragraph alone exceeds max chunk size, split it
      if (paragraphTokens > this.MAX_CHUNK_SIZE) {
        // Save current chunk if it has content
        if (currentChunk.trim().length > 0) {
          chunks.push(this.createChunk(currentChunk, chunkIndex++, position - currentChunk.length, position));
          currentChunk = '';
          currentTokens = 0;
        }

        // Split the large paragraph
        const paragraphChunks = this.chunkBySentences(paragraph);
        paragraphChunks.forEach(chunk => {
          chunks.push({
            ...chunk,
            chunkIndex: chunkIndex++,
            metadata: {
              ...chunk.metadata,
              startPosition: position + chunk.metadata.startPosition,
              endPosition: position + chunk.metadata.endPosition
            }
          });
        });

        position += paragraph.length;
        continue;
      }

      // Check if adding this paragraph would exceed target size
      if (currentTokens + paragraphTokens > this.TARGET_CHUNK_SIZE && currentChunk.trim().length > 0) {
        // Create chunk from current content
        chunks.push(this.createChunk(currentChunk, chunkIndex++, position - currentChunk.length, position));
        
        // Start new chunk with overlap if current chunk is substantial
        if (currentTokens > this.OVERLAP_SIZE) {
          const overlap = this.getOverlapText(currentChunk, this.OVERLAP_SIZE);
          currentChunk = overlap + '\n\n' + paragraph;
          currentTokens = this.estimateTokens(overlap) + paragraphTokens;
        } else {
          currentChunk = paragraph;
          currentTokens = paragraphTokens;
        }
      } else {
        // Add paragraph to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
        currentTokens += paragraphTokens;
      }

      position += paragraph.length;
    }

    // Add final chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(currentChunk, chunkIndex, position - currentChunk.length, position));
    }

    return this.validateChunks(chunks);
  }

  // Split text by sentences when paragraph splitting isn't effective
  private static chunkBySentences(content: string): SemanticChunk[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: SemanticChunk[] = [];
    
    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;
    let position = 0;

    for (const sentence of sentences) {
      const sentenceText = sentence.trim() + '.';
      const sentenceTokens = this.estimateTokens(sentenceText);

      if (currentTokens + sentenceTokens > this.TARGET_CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(this.createChunk(currentChunk, chunkIndex++, position - currentChunk.length, position));
        
        // Add overlap
        const overlap = this.getOverlapText(currentChunk, this.OVERLAP_SIZE);
        currentChunk = overlap + ' ' + sentenceText;
        currentTokens = this.estimateTokens(overlap) + sentenceTokens;
      } else {
        if (currentChunk.length > 0) {
          currentChunk += ' ' + sentenceText;
        } else {
          currentChunk = sentenceText;
        }
        currentTokens += sentenceTokens;
      }

      position += sentenceText.length;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(currentChunk, chunkIndex, position - currentChunk.length, position));
    }

    return chunks;
  }

  // Create a chunk object
  private static createChunk(content: string, index: number, start: number, end: number): SemanticChunk {
    const trimmedContent = content.trim();
    const sentences = trimmedContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    return {
      content: trimmedContent,
      tokenCount: this.estimateTokens(trimmedContent),
      chunkIndex: index,
      metadata: {
        startPosition: start,
        endPosition: end,
        sentences,
        semanticBoundary: true
      }
    };
  }

  // Get overlap text from the end of a chunk
  private static getOverlapText(text: string, targetTokens: number): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let overlap = '';
    let tokens = 0;

    // Take sentences from the end until we reach target tokens
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i].trim() + '.';
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (tokens + sentenceTokens > targetTokens) {
        break;
      }
      
      overlap = sentence + ' ' + overlap;
      tokens += sentenceTokens;
    }

    return overlap.trim();
  }

  // Validate and filter chunks
  private static validateChunks(chunks: SemanticChunk[]): SemanticChunk[] {
    return chunks.filter(chunk => {
      const tokens = chunk.tokenCount;
      const content = chunk.content.trim();
      
      // Filter out chunks that are too small or empty
      if (tokens < this.MIN_CHUNK_SIZE || content.length < 50) {
        return false;
      }

      // Filter out chunks that are mostly punctuation or whitespace
      const meaningfulChars = content.replace(/[\s\.,!?;:'"()-]/g, '').length;
      if (meaningfulChars < content.length * 0.6) {
        return false;
      }

      return true;
    });
  }
}
