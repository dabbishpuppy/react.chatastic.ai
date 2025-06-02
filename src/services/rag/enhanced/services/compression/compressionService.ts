import { CompressionResult, ContentAnalysis } from '../../types/compressionTypes';

export class CompressionService {
  // Maximum efficiency compression with multiple strategies
  static async compressWithMaximumEfficiency(
    chunks: string[], 
    analysis: ContentAnalysis,
    agentId: string
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    let processedChunks = [...chunks];
    
    // Apply content-specific compression strategies
    if (analysis.contentType === 'template') {
      processedChunks = this.removeTemplateRedundancy(processedChunks);
    }
    
    if (analysis.contentType === 'content-rich') {
      processedChunks = this.optimizeContentRichChunks(processedChunks);
    }
    
    // Apply semantic compression
    processedChunks = await this.applySemanticCompression(processedChunks);
    
    // Calculate compression metrics
    const originalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const compressedSize = processedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;
    
    return {
      compressedChunks: processedChunks,
      originalSize,
      compressedSize,
      compressionRatio,
      processingTime: Date.now() - startTime,
      strategy: `${analysis.contentType}-optimized`
    };
  }

  private static removeTemplateRedundancy(chunks: string[]): string[] {
    // Remove chunks that are highly similar (template content)
    const uniqueChunks: string[] = [];
    const seenPatterns = new Set<string>();
    
    for (const chunk of chunks) {
      const pattern = this.extractPattern(chunk);
      if (!seenPatterns.has(pattern)) {
        seenPatterns.add(pattern);
        uniqueChunks.push(chunk);
      }
    }
    
    return uniqueChunks;
  }

  private static optimizeContentRichChunks(chunks: string[]): string[] {
    // Optimize content-rich chunks by merging related content
    const optimizedChunks: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const currentChunk = chunks[i];
      
      // Look for mergeable chunks
      if (i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        const similarity = this.calculateSimilarity(currentChunk, nextChunk);
        
        if (similarity > 0.7 && (currentChunk.length + nextChunk.length) < 500) {
          optimizedChunks.push(`${currentChunk} ${nextChunk}`);
          i++; // Skip next chunk as it's been merged
        } else {
          optimizedChunks.push(currentChunk);
        }
      } else {
        optimizedChunks.push(currentChunk);
      }
    }
    
    return optimizedChunks;
  }

  private static async applySemanticCompression(chunks: string[]): Promise<string[]> {
    // Apply semantic-level compression by removing redundant information
    return chunks.map(chunk => {
      // Remove redundant words and phrases
      let compressed = chunk
        .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Keep minimum meaningful length
      if (compressed.length < chunk.length * 0.3) {
        return chunk; // Revert if too much compression
      }
      
      return compressed;
    }).filter(chunk => chunk.length > 20);
  }

  private static extractPattern(text: string): string {
    // Extract a pattern from text for similarity detection
    const words = text.toLowerCase().split(/\s+/).slice(0, 10);
    return words.join(' ');
  }

  private static calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}
