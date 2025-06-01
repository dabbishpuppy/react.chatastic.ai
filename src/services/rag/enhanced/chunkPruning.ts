export interface PrunedChunk {
  content: string;
  score: number;
  tokenCount: number;
  isHighValue: boolean;
}

export class ChunkPruningService {
  // Prune chunks to keep only the most valuable content per page
  static pruneChunks(chunks: string[], maxChunks: number = 5): PrunedChunk[] {
    const scoredChunks = chunks.map(chunk => this.scoreChunk(chunk));
    
    // Sort by score (highest first) and take top N
    const prunedChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks)
      .filter(chunk => chunk.isHighValue);
    
    console.log(`📊 Pruned ${chunks.length} chunks to ${prunedChunks.length} high-value chunks`);
    
    return prunedChunks;
  }

  protected static scoreChunk(content: string): PrunedChunk {
    const tokenCount = Math.ceil(content.length / 4);
    let score = 0;
    
    // Length scoring (prefer substantial content)
    if (tokenCount >= 50 && tokenCount <= 150) {
      score += 10; // Ideal length
    } else if (tokenCount >= 30 && tokenCount <= 200) {
      score += 5; // Acceptable length
    } else if (tokenCount < 20) {
      score -= 10; // Too short
    }
    
    // Content quality indicators
    const lowercaseContent = content.toLowerCase();
    
    // Positive indicators
    if (this.hasStructuredContent(content)) score += 15;
    if (this.hasKeywords(lowercaseContent)) score += 10;
    if (this.hasNumbers(content)) score += 5;
    if (this.hasProperSentences(content)) score += 8;
    
    // Negative indicators (boilerplate detection)
    if (this.hasBoilerplate(lowercaseContent)) score -= 20;
    if (this.hasNavigationalText(lowercaseContent)) score -= 15;
    if (this.hasPromotionalText(lowercaseContent)) score -= 10;
    if (this.isRepeatedContent(content)) score -= 25;
    
    const isHighValue = score > 0 && tokenCount >= 20;
    
    return {
      content,
      score,
      tokenCount,
      isHighValue
    };
  }

  private static hasStructuredContent(content: string): boolean {
    // Look for structured content indicators
    const structureIndicators = [
      /\d+\./,  // Numbered lists
      /•|▪|◦/,  // Bullet points
      /:\s*$/m, // Colons at end of lines (definitions)
      /\w+:\s+\w+/,  // Key-value pairs
    ];
    
    return structureIndicators.some(pattern => pattern.test(content));
  }

  private static hasKeywords(content: string): boolean {
    // Look for domain-specific or important keywords
    const importantPatterns = [
      /\b(about|how|what|why|when|where|process|method|solution|service|product)\b/,
      /\b(company|business|organization|team|contact|address|phone|email)\b/,
      /\b(feature|benefit|advantage|technology|innovation|expert)\b/,
    ];
    
    return importantPatterns.some(pattern => pattern.test(content));
  }

  private static hasNumbers(content: string): boolean {
    return /\d+/.test(content);
  }

  private static hasProperSentences(content: string): boolean {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.length >= 2;
  }

  private static hasBoilerplate(content: string): boolean {
    const boilerplatePatterns = [
      /cookie|privacy policy|terms of service|all rights reserved/,
      /copyright|©|\(c\)/,
      /subscribe|newsletter|follow us|social media/,
      /loading|please wait|error|404|not found/,
      /home|about|contact|services|products|menu/,
    ];
    
    return boilerplatePatterns.some(pattern => pattern.test(content));
  }

  private static hasNavigationalText(content: string): boolean {
    const navPatterns = [
      /\b(home|about|contact|services|products|blog|news|menu|navigation)\b/,
      /\b(next|previous|back|continue|skip|more|less)\b/,
      /\b(page \d+|of \d+|showing \d+)\b/,
    ];
    
    return navPatterns.some(pattern => pattern.test(content));
  }

  private static hasPromotionalText(content: string): boolean {
    const promoPatterns = [
      /\b(buy now|order now|shop now|get started|sign up|subscribe)\b/,
      /\b(free|discount|sale|offer|deal|limited time)\b/,
      /\b(click here|learn more|read more|find out|discover)\b/,
    ];
    
    return promoPatterns.some(pattern => pattern.test(content));
  }

  private static isRepeatedContent(content: string): boolean {
    // Check for highly repetitive content
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3) { // Only count meaningful words
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });
    
    // Check if any word appears more than 30% of the time
    const totalWords = words.length;
    const maxRepetition = Math.max(...Array.from(wordCounts.values()));
    
    return maxRepetition / totalWords > 0.3;
  }
}
