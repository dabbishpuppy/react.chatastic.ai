
export class ChunkProcessor {
  static createSemanticChunks(content: string, maxTokens: number = 150): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const chunks: string[] = [];
    let currentChunk = '';
    let tokenCount = 0;

    for (const sentence of sentences) {
      const sentenceTokens = sentence.trim().split(/\s+/).length;
      
      if (tokenCount + sentenceTokens > maxTokens && currentChunk) {
        if (currentChunk.trim().length > 30) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
        tokenCount = sentenceTokens;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
        tokenCount += sentenceTokens;
      }
    }
    
    if (currentChunk.trim().length > 30) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 20);
  }

  static estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  static validateChunkQuality(chunk: string): {
    isValid: boolean;
    quality: 'high' | 'medium' | 'low';
    reasons: string[];
  } {
    const reasons: string[] = [];
    let quality: 'high' | 'medium' | 'low' = 'high';

    // Check minimum length
    if (chunk.length < 50) {
      reasons.push('Too short');
      quality = 'low';
    }

    // Check for meaningful content
    const meaningfulWords = chunk.split(/\s+/).filter(word => 
      word.length > 3 && !/^\d+$/.test(word)
    ).length;

    if (meaningfulWords < 5) {
      reasons.push('Lacks meaningful content');
      quality = quality === 'high' ? 'medium' : 'low';
    }

    // Check for boilerplate
    const boilerplatePatterns = [
      /cookie|privacy|terms of service/i,
      /copyright|all rights reserved/i,
      /loading|please wait/i
    ];

    if (boilerplatePatterns.some(pattern => pattern.test(chunk))) {
      reasons.push('Contains boilerplate content');
      quality = quality === 'high' ? 'medium' : 'low';
    }

    return {
      isValid: quality !== 'low',
      quality,
      reasons
    };
  }
}
