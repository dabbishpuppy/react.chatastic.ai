
import { SemanticSearchResult } from './semanticSearch';
import { QueryContext } from './queryPreprocessor';

export interface RankedContext {
  chunks: SemanticSearchResult[];
  totalTokens: number;
  relevanceScore: number;
  sources: {
    sourceId: string;
    sourceName: string;
    sourceType: string;
    chunkCount: number;
  }[];
}

export interface RankingOptions {
  maxTokens?: number;
  maxChunks?: number;
  diversityWeight?: number;
  recencyWeight?: number;
  sourceTypeWeights?: Record<string, number>;
}

export class ContextRanker {
  private static readonly DEFAULT_OPTIONS: Required<RankingOptions> = {
    maxTokens: 4000,
    maxChunks: 10,
    diversityWeight: 0.3,
    recencyWeight: 0.1,
    sourceTypeWeights: {
      qa: 1.2,      // Q&A sources are highly relevant
      text: 1.0,    // Standard text sources
      file: 0.9,    // File sources slightly lower
      website: 0.8  // Website sources lowest priority
    }
  };

  static async rankAndOptimizeContext(
    searchResults: SemanticSearchResult[],
    queryContext: QueryContext,
    options: RankingOptions = {}
  ): Promise<RankedContext> {
    console.log('🎯 Ranking and optimizing context:', {
      initialResults: searchResults.length,
      maxTokens: options.maxTokens || this.DEFAULT_OPTIONS.maxTokens
    });

    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (searchResults.length === 0) {
      return {
        chunks: [],
        totalTokens: 0,
        relevanceScore: 0,
        sources: []
      };
    }

    // Step 1: Score each chunk
    const scoredChunks = this.scoreChunks(searchResults, queryContext, opts);
    
    // Step 2: Apply diversity filtering
    const diversifiedChunks = this.applyDiversityFiltering(scoredChunks, opts);
    
    // Step 3: Optimize for token limit
    const optimizedChunks = this.optimizeForTokenLimit(diversifiedChunks, opts);
    
    // Step 4: Calculate final metrics
    const totalTokens = this.calculateTotalTokens(optimizedChunks);
    const relevanceScore = this.calculateAverageRelevance(optimizedChunks);
    const sources = this.extractSourceMetadata(optimizedChunks);

    console.log('✅ Context ranking complete:', {
      finalChunks: optimizedChunks.length,
      totalTokens,
      averageRelevance: relevanceScore,
      uniqueSources: sources.length
    });

    return {
      chunks: optimizedChunks,
      totalTokens,
      relevanceScore,
      sources
    };
  }

  private static scoreChunks(
    chunks: SemanticSearchResult[],
    queryContext: QueryContext,
    options: Required<RankingOptions>
  ): (SemanticSearchResult & { finalScore: number })[] {
    return chunks.map(chunk => {
      let score = chunk.similarity; // Base similarity score
      
      // Apply source type weight
      const sourceTypeWeight = options.sourceTypeWeights[chunk.metadata.sourceType] || 1.0;
      score *= sourceTypeWeight;
      
      // Apply recency weight
      const ageInDays = this.getAgeInDays(chunk.metadata.createdAt);
      const recencyMultiplier = Math.max(0.5, 1.0 - (ageInDays / 365) * options.recencyWeight);
      score *= recencyMultiplier;
      
      // Boost score for keyword matches
      const keywordBoost = this.calculateKeywordBoost(chunk.content, queryContext.keywords);
      score += keywordBoost;
      
      // Intent-based scoring
      const intentBoost = this.calculateIntentBoost(chunk.content, queryContext.intent);
      score += intentBoost;

      return {
        ...chunk,
        finalScore: Math.min(score, 2.0) // Cap score at 2.0
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  private static applyDiversityFiltering(
    scoredChunks: (SemanticSearchResult & { finalScore: number })[],
    options: Required<RankingOptions>
  ): (SemanticSearchResult & { finalScore: number })[] {
    const sourceChunkCounts = new Map<string, number>();
    const maxChunksPerSource = Math.max(2, Math.floor(options.maxChunks / 3));
    
    return scoredChunks.filter(chunk => {
      const currentCount = sourceChunkCounts.get(chunk.sourceId) || 0;
      
      if (currentCount >= maxChunksPerSource) {
        // Only include if score is significantly higher than average
        const averageScore = scoredChunks.slice(0, 10).reduce((sum, c) => sum + c.finalScore, 0) / 10;
        return chunk.finalScore > averageScore * 1.5;
      }
      
      sourceChunkCounts.set(chunk.sourceId, currentCount + 1);
      return true;
    });
  }

  private static optimizeForTokenLimit(
    chunks: (SemanticSearchResult & { finalScore: number })[],
    options: Required<RankingOptions>
  ): SemanticSearchResult[] {
    const selectedChunks: SemanticSearchResult[] = [];
    let currentTokens = 0;
    
    for (const chunk of chunks) {
      const chunkTokens = this.estimateTokens(chunk.content);
      
      if (currentTokens + chunkTokens <= options.maxTokens && selectedChunks.length < options.maxChunks) {
        selectedChunks.push(chunk);
        currentTokens += chunkTokens;
      } else if (selectedChunks.length === 0) {
        // Always include at least one chunk, even if it exceeds token limit
        selectedChunks.push({
          ...chunk,
          content: this.truncateToTokenLimit(chunk.content, options.maxTokens)
        });
        break;
      } else {
        break;
      }
    }
    
    return selectedChunks;
  }

  private static calculateKeywordBoost(content: string, keywords: string[]): number {
    const contentLower = content.toLowerCase();
    let boost = 0;
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      if (contentLower.includes(keywordLower)) {
        boost += 0.1;
      }
    }
    
    return Math.min(boost, 0.5); // Cap boost at 0.5
  }

  private static calculateIntentBoost(content: string, intent: QueryContext['intent']): number {
    const contentLower = content.toLowerCase();
    
    switch (intent) {
      case 'question':
        if (contentLower.includes('?') || contentLower.includes('answer')) {
          return 0.1;
        }
        break;
      case 'command':
        if (contentLower.includes('how to') || contentLower.includes('step')) {
          return 0.1;
        }
        break;
      default:
        return 0;
    }
    
    return 0;
  }

  private static getAgeInDays(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  private static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private static truncateToTokenLimit(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    
    return text.substring(0, maxChars - 3) + '...';
  }

  private static calculateTotalTokens(chunks: SemanticSearchResult[]): number {
    return chunks.reduce((total, chunk) => total + this.estimateTokens(chunk.content), 0);
  }

  private static calculateAverageRelevance(chunks: SemanticSearchResult[]): number {
    if (chunks.length === 0) return 0;
    return chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length;
  }

  private static extractSourceMetadata(chunks: SemanticSearchResult[]): RankedContext['sources'] {
    const sourceMap = new Map<string, {
      sourceId: string;
      sourceName: string;
      sourceType: string;
      chunkCount: number;
    }>();

    for (const chunk of chunks) {
      const existing = sourceMap.get(chunk.sourceId);
      if (existing) {
        existing.chunkCount++;
      } else {
        sourceMap.set(chunk.sourceId, {
          sourceId: chunk.sourceId,
          sourceName: chunk.metadata.sourceName,
          sourceType: chunk.metadata.sourceType,
          chunkCount: 1
        });
      }
    }

    return Array.from(sourceMap.values());
  }
}
