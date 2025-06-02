import { SemanticSearchResult } from './semanticSearch';
import { QueryContext } from './queryPreprocessor';
import { IntelligentContextFilter, FilteredContext } from './intelligentContextFilter';
import { AdvancedQueryPreprocessor, AdvancedQueryAnalysis } from './advancedQueryPreprocessor';

export interface RankingOptions {
  maxTokens?: number;
  maxChunks?: number;
  diversityWeight?: number;
  recencyWeight?: number;
  enableAdvancedFiltering?: boolean;
}

export interface RankedChunk extends SemanticSearchResult {
  finalScore: number;
  rankingFactors: {
    similarity: number;
    recency: number;
    diversity: number;
    conversationRelevance: number;
  };
}

export interface RankedContext {
  chunks: RankedChunk[];
  sources: Array<{
    sourceId: string;
    sourceName: string;
    sourceType: string;
    chunksUsed: number;
  }>;
  totalTokens: number;
  relevanceScore: number;
  diversityScore: number;
  metadata: {
    originalResultsCount: number;
    finalResultsCount: number;
    averageConfidence: number;
    processingTime: number;
    advancedFilteringUsed: boolean;
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
      resultsCount: searchResults.length,
      queryType: queryContext.intent,
      advancedFiltering: options.enableAdvancedFiltering !== false
    });

    try {
      let processedResults = searchResults;
      let advancedAnalysis: AdvancedQueryAnalysis | undefined;
      let filteredContext: FilteredContext | undefined;

      // Use advanced filtering if enabled
      if (options.enableAdvancedFiltering !== false) {
        // Perform advanced query analysis
        advancedAnalysis = await AdvancedQueryPreprocessor.analyzeQuery(
          queryContext.originalQuery,
          queryContext.agentId,
          queryContext.conversationId
        );

        // Apply intelligent context filtering
        filteredContext = await IntelligentContextFilter.filterAndOptimizeContext(
          searchResults,
          queryContext,
          advancedAnalysis,
          {
            maxContextTokens: options.maxTokens,
            diversityThreshold: options.diversityWeight || 0.3,
            recencyWeight: options.recencyWeight || 0.2,
            relevanceThreshold: 0.3
          }
        );

        processedResults = filteredContext.chunks;
      }

      // Apply traditional ranking with enhancements
      const rankedChunks = this.calculateFinalScores(
        processedResults,
        queryContext,
        advancedAnalysis,
        options
      );

      // Apply final limits
      const finalChunks = this.applyFinalLimits(rankedChunks, options);

      // Calculate aggregate metrics
      const sources = this.calculateSourceMetrics(finalChunks);
      const totalTokens = this.calculateTotalTokens(finalChunks);
      const relevanceScore = this.calculateRelevanceScore(finalChunks);
      const diversityScore = filteredContext?.diversityScore || this.calculateDiversityScore(finalChunks);

      const processingTime = Date.now() - startTime;

      const result: RankedContext = {
        chunks: finalChunks,
        sources,
        totalTokens,
        relevanceScore,
        diversityScore,
        metadata: {
          originalResultsCount: searchResults.length,
          finalResultsCount: finalChunks.length,
          averageConfidence: advancedAnalysis?.intentConfidence || 0.5,
          processingTime,
          advancedFilteringUsed: options.enableAdvancedFiltering !== false
        }
      };

      console.log('✅ Context ranking complete:', {
        finalChunks: finalChunks.length,
        totalTokens,
        relevanceScore: Math.round(relevanceScore * 100) / 100,
        diversityScore: Math.round(diversityScore * 100) / 100,
        processingTime
      });

      return result;
    } catch (error) {
      console.error('❌ Context ranking failed:', error);
      throw error;
    }
  }

  private static calculateFinalScores(
    results: SemanticSearchResult[],
    queryContext: QueryContext,
    advancedAnalysis?: AdvancedQueryAnalysis,
    options: RankingOptions = {}
  ): RankedChunk[] {
    const now = new Date();
    
    return results.map(result => {
      const rankingFactors = {
        similarity: result.similarity,
        recency: this.calculateRecencyScore(result.metadata.createdAt, now),
        diversity: 1.0, // Will be calculated relative to other chunks
        conversationRelevance: this.calculateConversationRelevance(
          result,
          advancedAnalysis?.conversationContext
        )
      };

      // Calculate weighted final score
      const weights = {
        similarity: 0.5,
        recency: options.recencyWeight || 0.2,
        diversity: options.diversityWeight || 0.2,
        conversationRelevance: 0.1
      };

      const finalScore = 
        rankingFactors.similarity * weights.similarity +
        rankingFactors.recency * weights.recency +
        rankingFactors.diversity * weights.diversity +
        rankingFactors.conversationRelevance * weights.conversationRelevance;

      return {
        ...result,
        finalScore,
        rankingFactors
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  private static calculateRecencyScore(createdAt: string, now: Date): number {
    const chunkDate = new Date(createdAt);
    const daysDiff = (now.getTime() - chunkDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: newer content gets higher scores
    return Math.exp(-daysDiff / 30); // 30-day half-life
  }

  private static calculateConversationRelevance(
    result: SemanticSearchResult,
    conversationContext?: AdvancedQueryAnalysis['conversationContext']
  ): number {
    if (!conversationContext) return 0;

    let relevance = 0;
    const contentLower = result.content.toLowerCase();

    // Check topic matches
    conversationContext.topics.forEach(topic => {
      if (contentLower.includes(topic.toLowerCase())) {
        relevance += 0.3;
      }
    });

    // Check entity matches
    conversationContext.entities.forEach(entity => {
      if (contentLower.includes(entity.toLowerCase())) {
        relevance += 0.5;
      }
    });

    return Math.min(relevance, 1.0);
  }

  private static applyFinalLimits(
    rankedChunks: RankedChunk[],
    options: RankingOptions
  ): RankedChunk[] {
    let finalChunks = rankedChunks;

    // Apply chunk count limit
    if (options.maxChunks && finalChunks.length > options.maxChunks) {
      finalChunks = finalChunks.slice(0, options.maxChunks);
    }

    // Apply token limit
    if (options.maxTokens) {
      let currentTokens = 0;
      const tokenLimitedChunks: RankedChunk[] = [];

      for (const chunk of finalChunks) {
        const chunkTokens = this.estimateTokens(chunk.content);
        if (currentTokens + chunkTokens <= options.maxTokens) {
          tokenLimitedChunks.push(chunk);
          currentTokens += chunkTokens;
        } else {
          break;
        }
      }

      finalChunks = tokenLimitedChunks;
    }

    return finalChunks;
  }

  private static calculateSourceMetrics(chunks: RankedChunk[]): RankedContext['sources'] {
    const sourceMap = new Map<string, { sourceName: string; sourceType: string; count: number }>();

    chunks.forEach(chunk => {
      const existing = sourceMap.get(chunk.sourceId);
      if (existing) {
        existing.count++;
      } else {
        sourceMap.set(chunk.sourceId, {
          sourceName: chunk.metadata.sourceName,
          sourceType: chunk.metadata.sourceType,
          count: 1
        });
      }
    });

    return Array.from(sourceMap.entries()).map(([sourceId, data]) => ({
      sourceId,
      sourceName: data.sourceName,
      sourceType: data.sourceType,
      chunksUsed: data.count
    }));
  }

  private static calculateTotalTokens(chunks: RankedChunk[]): number {
    return chunks.reduce((total, chunk) => total + this.estimateTokens(chunk.content), 0);
  }

  private static calculateRelevanceScore(chunks: RankedChunk[]): number {
    if (chunks.length === 0) return 0;
    return chunks.reduce((sum, chunk) => sum + chunk.finalScore, 0) / chunks.length;
  }

  private static calculateDiversityScore(chunks: RankedChunk[]): number {
    if (chunks.length <= 1) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        totalSimilarity += this.calculateContentSimilarity(chunks[i].content, chunks[j].content);
        comparisons++;
      }
    }

    const averageSimilarity = totalSimilarity / comparisons;
    return 1.0 - averageSimilarity;
  }

  private static calculateContentSimilarity(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
