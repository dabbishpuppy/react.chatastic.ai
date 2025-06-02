
import { SemanticSearchResult } from './semanticSearch';
import { QueryContext } from './queryPreprocessor';
import { AdvancedQueryAnalysis } from './advancedQueryPreprocessor';

export interface FilteringOptions {
  maxContextTokens?: number;
  diversityThreshold?: number;
  recencyWeight?: number;
  relevanceThreshold?: number;
  includeMetadata?: boolean;
}

export interface FilteredContext {
  chunks: SemanticSearchResult[];
  totalTokens: number;
  diversityScore: number;
  averageRelevance: number;
  filteringMetadata: {
    originalCount: number;
    filteredCount: number;
    filteringReason: string[];
    processingTime: number;
  };
}

export class IntelligentContextFilter {
  static async filterAndOptimizeContext(
    searchResults: SemanticSearchResult[],
    queryContext: QueryContext,
    advancedAnalysis: AdvancedQueryAnalysis,
    options: FilteringOptions = {}
  ): Promise<FilteredContext> {
    const startTime = Date.now();
    
    console.log('🎯 Filtering and optimizing context:', {
      originalResults: searchResults.length,
      queryComplexity: advancedAnalysis.complexity,
      intentConfidence: advancedAnalysis.intentConfidence
    });

    try {
      let filteredChunks = [...searchResults];
      const filteringReasons: string[] = [];

      // Step 1: Apply relevance threshold
      const relevanceThreshold = options.relevanceThreshold || this.getRelevanceThreshold(advancedAnalysis);
      filteredChunks = filteredChunks.filter(chunk => chunk.similarity >= relevanceThreshold);
      if (filteredChunks.length < searchResults.length) {
        filteringReasons.push(`Relevance threshold: ${relevanceThreshold}`);
      }

      // Step 2: Apply diversity filtering
      filteredChunks = this.applyDiversityFiltering(
        filteredChunks,
        options.diversityThreshold || 0.3
      );
      filteringReasons.push('Diversity filtering applied');

      // Step 3: Apply recency weighting if suggested
      if (advancedAnalysis.suggestedFilters.timeRange) {
        filteredChunks = this.applyRecencyWeighting(
          filteredChunks,
          advancedAnalysis.suggestedFilters.timeRange,
          options.recencyWeight || 0.2
        );
        filteringReasons.push('Recency weighting applied');
      }

      // Step 4: Apply token limit optimization
      const maxTokens = options.maxContextTokens || this.getMaxTokensForComplexity(advancedAnalysis.complexity);
      const tokenOptimizedResult = this.optimizeForTokenLimit(filteredChunks, maxTokens);
      filteredChunks = tokenOptimizedResult.chunks;
      if (tokenOptimizedResult.wasOptimized) {
        filteringReasons.push(`Token limit optimization: ${maxTokens} tokens`);
      }

      // Step 5: Apply conversation context filtering
      if (advancedAnalysis.conversationContext) {
        filteredChunks = this.applyConversationContextFiltering(
          filteredChunks,
          advancedAnalysis.conversationContext
        );
        filteringReasons.push('Conversation context filtering applied');
      }

      // Calculate metrics
      const totalTokens = this.calculateTotalTokens(filteredChunks);
      const diversityScore = this.calculateDiversityScore(filteredChunks);
      const averageRelevance = filteredChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / filteredChunks.length;

      const processingTime = Date.now() - startTime;

      const result: FilteredContext = {
        chunks: filteredChunks,
        totalTokens,
        diversityScore,
        averageRelevance,
        filteringMetadata: {
          originalCount: searchResults.length,
          filteredCount: filteredChunks.length,
          filteringReason: filteringReasons,
          processingTime
        }
      };

      console.log('✅ Context filtering complete:', {
        originalCount: searchResults.length,
        filteredCount: filteredChunks.length,
        totalTokens,
        diversityScore: Math.round(diversityScore * 100) / 100,
        averageRelevance: Math.round(averageRelevance * 100) / 100,
        processingTime
      });

      return result;
    } catch (error) {
      console.error('❌ Context filtering failed:', error);
      throw error;
    }
  }

  private static getRelevanceThreshold(analysis: AdvancedQueryAnalysis): number {
    // Adjust threshold based on query complexity and intent confidence
    let threshold = 0.3; // Base threshold

    if (analysis.complexity === 'simple') threshold = 0.4;
    else if (analysis.complexity === 'complex') threshold = 0.25;

    if (analysis.intentConfidence > 0.8) threshold += 0.1;
    else if (analysis.intentConfidence < 0.5) threshold -= 0.05;

    return Math.max(0.1, Math.min(0.7, threshold));
  }

  private static getMaxTokensForComplexity(complexity: 'simple' | 'moderate' | 'complex'): number {
    switch (complexity) {
      case 'simple': return 1000;
      case 'moderate': return 2000;
      case 'complex': return 4000;
      default: return 2000;
    }
  }

  private static applyDiversityFiltering(
    chunks: SemanticSearchResult[],
    diversityThreshold: number
  ): SemanticSearchResult[] {
    if (chunks.length <= 1) return chunks;

    const filtered: SemanticSearchResult[] = [chunks[0]]; // Always include the highest scoring chunk
    
    for (let i = 1; i < chunks.length; i++) {
      const candidate = chunks[i];
      let isDiverse = true;

      // Check diversity against already selected chunks
      for (const selected of filtered) {
        const similarity = this.calculateContentSimilarity(candidate.content, selected.content);
        if (similarity > diversityThreshold) {
          isDiverse = false;
          break;
        }
      }

      if (isDiverse) {
        filtered.push(candidate);
      }
    }

    return filtered;
  }

  private static applyRecencyWeighting(
    chunks: SemanticSearchResult[],
    timeRange: { start: Date; end: Date },
    recencyWeight: number
  ): SemanticSearchResult[] {
    return chunks.map(chunk => {
      const chunkDate = new Date(chunk.metadata.createdAt);
      const isRecent = chunkDate >= timeRange.start && chunkDate <= timeRange.end;
      
      if (isRecent) {
        // Boost similarity score for recent content
        return {
          ...chunk,
          similarity: Math.min(1.0, chunk.similarity + recencyWeight)
        };
      }
      
      return chunk;
    }).sort((a, b) => b.similarity - a.similarity);
  }

  private static optimizeForTokenLimit(
    chunks: SemanticSearchResult[],
    maxTokens: number
  ): { chunks: SemanticSearchResult[]; wasOptimized: boolean } {
    let currentTokens = 0;
    const optimized: SemanticSearchResult[] = [];
    let wasOptimized = false;

    for (const chunk of chunks) {
      const chunkTokens = this.estimateTokens(chunk.content);
      
      if (currentTokens + chunkTokens <= maxTokens) {
        optimized.push(chunk);
        currentTokens += chunkTokens;
      } else {
        wasOptimized = true;
        break;
      }
    }

    return { chunks: optimized, wasOptimized };
  }

  private static applyConversationContextFiltering(
    chunks: SemanticSearchResult[],
    conversationContext: AdvancedQueryAnalysis['conversationContext']
  ): SemanticSearchResult[] {
    if (!conversationContext) return chunks;

    // Boost chunks that contain topics or entities from conversation context
    return chunks.map(chunk => {
      let boost = 0;
      const chunkContent = chunk.content.toLowerCase();

      // Check for topic matches
      conversationContext.topics.forEach(topic => {
        if (chunkContent.includes(topic.toLowerCase())) {
          boost += 0.05;
        }
      });

      // Check for entity matches
      conversationContext.entities.forEach(entity => {
        if (chunkContent.includes(entity.toLowerCase())) {
          boost += 0.1;
        }
      });

      return {
        ...chunk,
        similarity: Math.min(1.0, chunk.similarity + boost)
      };
    }).sort((a, b) => b.similarity - a.similarity);
  }

  private static calculateContentSimilarity(content1: string, content2: string): number {
    // Simple Jaccard similarity for content diversity checking
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private static calculateTotalTokens(chunks: SemanticSearchResult[]): number {
    return chunks.reduce((total, chunk) => total + this.estimateTokens(chunk.content), 0);
  }

  private static calculateDiversityScore(chunks: SemanticSearchResult[]): number {
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
    return 1.0 - averageSimilarity; // Higher diversity = lower average similarity
  }

  private static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
