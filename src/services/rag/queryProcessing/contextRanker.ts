import { SemanticSearchResult } from './semanticSearch';
import { QueryContext } from './queryPreprocessor';

export interface RankingOptions {
  maxChunks?: number;
  maxTokens?: number;
  diversityWeight?: number;
  recencyWeight?: number;
  sourceAuthorityWeight?: number;
  relevanceThreshold?: number;
  preserveOrder?: boolean;
}

export interface RankedChunk {
  chunkId: string;
  sourceId: string;
  content: string;
  relevanceScore: number;
  diversityScore: number;
  recencyScore: number;
  authorityScore: number;
  finalScore: number;
  metadata: {
    sourceName: string;
    sourceType: string;
    chunkIndex: number;
    tokenCount: number;
    [key: string]: any;
  };
}

export interface RankedContext {
  chunks: RankedChunk[];
  sources: Array<{
    sourceId: string;
    sourceName: string;
    chunkCount: number;
    averageRelevance: number;
  }>;
  totalTokens: number;
  relevanceScore: number;
  diversityScore: number;
  processingMetrics: {
    originalChunks: number;
    filteredChunks: number;
    rankingTime: number;
  };
}

export class ContextRanker {
  static async rankAndOptimizeContext(
    searchResults: SemanticSearchResult[],
    queryContext: QueryContext,
    options: RankingOptions = {}
  ): Promise<RankedContext> {
    const startTime = Date.now();
    
    console.log('🎯 Ranking and optimizing context:', {
      totalResults: searchResults.length,
      maxChunks: options.maxChunks || 10,
      maxTokens: options.maxTokens || 4000
    });

    // Set default options
    const rankingOptions: Required<RankingOptions> = {
      maxChunks: options.maxChunks || 10,
      maxTokens: options.maxTokens || 4000,
      diversityWeight: options.diversityWeight || 0.3,
      recencyWeight: options.recencyWeight || 0.2,
      sourceAuthorityWeight: options.sourceAuthorityWeight || 0.2,
      relevanceThreshold: options.relevanceThreshold || 0.3,
      preserveOrder: options.preserveOrder || false
    };

    try {
      // Step 1: Filter by relevance threshold
      const relevantResults = searchResults.filter(
        result => result.similarity >= rankingOptions.relevanceThreshold
      );

      if (relevantResults.length === 0) {
        return this.createEmptyContext(searchResults.length, Date.now() - startTime);
      }

      // Step 2: Calculate comprehensive scores for each chunk
      const scoredChunks = await this.calculateComprehensiveScores(
        relevantResults,
        queryContext,
        rankingOptions
      );

      // Step 3: Apply diversity filtering
      const diversifiedChunks = this.applyDiversityFiltering(
        scoredChunks,
        rankingOptions.diversityWeight
      );

      // Step 4: Optimize for token limits
      const optimizedChunks = this.optimizeForTokenLimits(
        diversifiedChunks,
        rankingOptions.maxChunks,
        rankingOptions.maxTokens
      );

      // Step 5: Generate final ranked context
      const rankedContext = this.generateRankedContext(
        optimizedChunks,
        searchResults.length,
        Date.now() - startTime
      );

      console.log('✅ Context ranking complete:', {
        originalChunks: searchResults.length,
        finalChunks: rankedContext.chunks.length,
        totalTokens: rankedContext.totalTokens,
        avgRelevance: rankedContext.relevanceScore,
        processingTime: rankedContext.processingMetrics.rankingTime
      });

      return rankedContext;

    } catch (error) {
      console.error('❌ Context ranking failed:', error);
      return this.createEmptyContext(searchResults.length, Date.now() - startTime);
    }
  }

  private static async calculateComprehensiveScores(
    results: SemanticSearchResult[],
    queryContext: QueryContext,
    options: Required<RankingOptions>
  ): Promise<RankedChunk[]> {
    const chunks: RankedChunk[] = [];

    for (const result of results) {
      // Calculate individual scores
      const relevanceScore = result.similarity;
      const diversityScore = this.calculateDiversityScore(result, results);
      const recencyScore = this.calculateRecencyScore(result);
      const authorityScore = this.calculateAuthorityScore(result);

      // Calculate weighted final score
      const finalScore = this.calculateWeightedScore({
        relevanceScore,
        diversityScore,
        recencyScore,
        authorityScore
      }, options);

      // Ensure all required metadata properties are present
      const metadata = {
        sourceName: result.metadata.sourceName || result.sourceTitle || 'Unknown Source',
        sourceType: result.metadata.sourceType || result.sourceType || 'text',
        chunkIndex: result.metadata.chunkIndex || 0,
        tokenCount: result.metadata.tokenCount || this.estimateTokenCount(result.content),
        ...result.metadata
      };

      chunks.push({
        chunkId: result.chunkId,
        sourceId: result.sourceId,
        content: result.content,
        relevanceScore,
        diversityScore,
        recencyScore,
        authorityScore,
        finalScore,
        metadata
      });
    }

    return chunks.sort((a, b) => b.finalScore - a.finalScore);
  }

  private static calculateDiversityScore(
    target: SemanticSearchResult,
    allResults: SemanticSearchResult[]
  ): number {
    // Calculate how different this chunk is from others
    const similarities = allResults
      .filter(r => r.chunkId !== target.chunkId)
      .map(r => this.calculateContentSimilarity(target.content, r.content));

    if (similarities.length === 0) return 1.0;

    const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    return 1.0 - avgSimilarity; // Higher diversity = lower similarity to others
  }

  private static calculateRecencyScore(result: SemanticSearchResult): number {
    try {
      const createdAt = new Date(result.metadata.createdAt);
      const now = new Date();
      const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      // More recent content gets higher scores
      return Math.max(0.1, 1.0 - (daysDiff / 365)); // Decay over a year
    } catch {
      return 0.5; // Default score if date parsing fails
    }
  }

  private static calculateAuthorityScore(result: SemanticSearchResult): number {
    // Calculate authority based on source type and metadata
    const sourceTypeScores: Record<string, number> = {
      'documentation': 0.9,
      'official_guide': 0.8,
      'faq': 0.7,
      'blog_post': 0.6,
      'user_content': 0.5,
      'text': 0.6
    };

    const baseScore = sourceTypeScores[result.metadata.sourceType] || 0.5;
    
    // Boost score for longer, more detailed content
    const contentLength = result.content.length;
    const lengthBonus = Math.min(0.3, contentLength / 2000);
    
    return Math.min(1.0, baseScore + lengthBonus);
  }

  private static calculateWeightedScore(
    scores: {
      relevanceScore: number;
      diversityScore: number;
      recencyScore: number;
      authorityScore: number;
    },
    options: Required<RankingOptions>
  ): number {
    const relevanceWeight = 1.0 - options.diversityWeight - options.recencyWeight - options.sourceAuthorityWeight;
    
    return (
      scores.relevanceScore * relevanceWeight +
      scores.diversityScore * options.diversityWeight +
      scores.recencyScore * options.recencyWeight +
      scores.authorityScore * options.sourceAuthorityWeight
    );
  }

  private static applyDiversityFiltering(
    chunks: RankedChunk[],
    diversityWeight: number
  ): RankedChunk[] {
    if (diversityWeight === 0) return chunks;

    const selected: RankedChunk[] = [];
    const remaining = [...chunks];

    // Always include the highest scoring chunk
    if (remaining.length > 0) {
      selected.push(remaining.shift()!);
    }

    // Select remaining chunks considering diversity
    while (remaining.length > 0 && selected.length < chunks.length) {
      let bestChunk = remaining[0];
      let bestScore = -1;

      for (const chunk of remaining) {
        // Calculate diversity bonus against already selected chunks
        const diversityBonus = this.calculateDiversityBonus(chunk, selected);
        const adjustedScore = chunk.finalScore + (diversityBonus * diversityWeight);

        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestChunk = chunk;
        }
      }

      selected.push(bestChunk);
      remaining.splice(remaining.indexOf(bestChunk), 1);
    }

    return selected;
  }

  private static calculateDiversityBonus(
    candidate: RankedChunk,
    selected: RankedChunk[]
  ): number {
    if (selected.length === 0) return 0;

    const similarities = selected.map(chunk => 
      this.calculateContentSimilarity(candidate.content, chunk.content)
    );

    const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    return 1.0 - avgSimilarity; // Higher bonus for more diverse content
  }

  private static optimizeForTokenLimits(
    chunks: RankedChunk[],
    maxChunks: number,
    maxTokens: number
  ): RankedChunk[] {
    let totalTokens = 0;
    const optimized: RankedChunk[] = [];

    for (const chunk of chunks) {
      if (optimized.length >= maxChunks) break;
      
      const chunkTokens = chunk.metadata.tokenCount;
      if (totalTokens + chunkTokens <= maxTokens) {
        optimized.push(chunk);
        totalTokens += chunkTokens;
      } else if (optimized.length === 0) {
        // If first chunk exceeds limit, truncate it
        const truncatedContent = this.truncateToTokenLimit(
          chunk.content,
          maxTokens
        );
        optimized.push({
          ...chunk,
          content: truncatedContent,
          metadata: {
            ...chunk.metadata,
            tokenCount: maxTokens,
            truncated: true
          }
        });
        break;
      }
    }

    return optimized;
  }

  private static generateRankedContext(
    chunks: RankedChunk[],
    originalCount: number,
    processingTime: number
  ): RankedContext {
    // Group chunks by source
    const sourceMap = new Map<string, RankedChunk[]>();
    for (const chunk of chunks) {
      if (!sourceMap.has(chunk.sourceId)) {
        sourceMap.set(chunk.sourceId, []);
      }
      sourceMap.get(chunk.sourceId)!.push(chunk);
    }

    // Calculate source statistics
    const sources = Array.from(sourceMap.entries()).map(([sourceId, sourceChunks]) => ({
      sourceId,
      sourceName: sourceChunks[0].metadata.sourceName,
      chunkCount: sourceChunks.length,
      averageRelevance: sourceChunks.reduce((sum, chunk) => sum + chunk.relevanceScore, 0) / sourceChunks.length
    }));

    // Calculate overall metrics
    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.metadata.tokenCount, 0);
    const relevanceScore = chunks.length > 0 
      ? chunks.reduce((sum, chunk) => sum + chunk.relevanceScore, 0) / chunks.length 
      : 0;
    const diversityScore = chunks.length > 0
      ? chunks.reduce((sum, chunk) => sum + chunk.diversityScore, 0) / chunks.length
      : 0;

    return {
      chunks,
      sources,
      totalTokens,
      relevanceScore,
      diversityScore,
      processingMetrics: {
        originalChunks: originalCount,
        filteredChunks: chunks.length,
        rankingTime: processingTime
      }
    };
  }

  private static createEmptyContext(originalCount: number, processingTime: number): RankedContext {
    return {
      chunks: [],
      sources: [],
      totalTokens: 0,
      relevanceScore: 0,
      diversityScore: 0,
      processingMetrics: {
        originalChunks: originalCount,
        filteredChunks: 0,
        rankingTime: processingTime
      }
    };
  }

  private static calculateContentSimilarity(content1: string, content2: string): number {
    // Simple word-based similarity calculation
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private static estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private static truncateToTokenLimit(text: string, maxTokens: number): string {
    const estimatedChars = maxTokens * 4;
    if (text.length <= estimatedChars) return text;
    
    return text.substring(0, estimatedChars - 3) + '...';
  }
}
