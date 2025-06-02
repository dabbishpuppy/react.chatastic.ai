
import { supabase } from '@/integrations/supabase/client';

export interface QueryContext {
  originalQuery: string;
  normalizedQuery: string;
  intent: 'question' | 'command' | 'search' | 'conversation';
  keywords: string[];
  agentId: string;
  conversationId?: string;
  filters?: {
    sourceTypes?: string[];
    dateRange?: { start: Date; end: Date };
    sources?: string[];
  };
}

export interface QueryPreprocessingResult {
  context: QueryContext;
  searchQueries: string[];
  confidence: number;
}

export class QueryPreprocessor {
  static async preprocessQuery(
    query: string,
    agentId: string,
    conversationId?: string,
    filters?: QueryContext['filters']
  ): Promise<QueryPreprocessingResult> {
    console.log('🔍 Preprocessing query:', { query: query.substring(0, 50) + '...', agentId });

    // Normalize the query
    const normalizedQuery = this.normalizeQuery(query);
    
    // Detect intent
    const intent = this.detectIntent(normalizedQuery);
    
    // Extract keywords
    const keywords = this.extractKeywords(normalizedQuery);
    
    // Generate search variations
    const searchQueries = this.generateSearchVariations(normalizedQuery, keywords);
    
    const context: QueryContext = {
      originalQuery: query,
      normalizedQuery,
      intent,
      keywords,
      agentId,
      conversationId,
      filters
    };

    // Calculate confidence based on query quality
    const confidence = this.calculateConfidence(normalizedQuery, keywords);

    console.log('✅ Query preprocessing complete:', {
      intent,
      keywordCount: keywords.length,
      searchVariations: searchQueries.length,
      confidence
    });

    return {
      context,
      searchQueries,
      confidence
    };
  }

  private static normalizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\-\.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static detectIntent(query: string): QueryContext['intent'] {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
    const commandWords = ['create', 'make', 'build', 'generate', 'write', 'help'];
    
    const words = query.split(' ');
    const firstWord = words[0];
    
    if (questionWords.includes(firstWord) || query.includes('?')) {
      return 'question';
    }
    
    if (commandWords.includes(firstWord)) {
      return 'command';
    }
    
    if (words.length <= 3) {
      return 'search';
    }
    
    return 'conversation';
  }

  private static extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could'
    ]);

    return query
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  private static generateSearchVariations(query: string, keywords: string[]): string[] {
    const variations = [query];
    
    // Add keyword-only search
    if (keywords.length > 0) {
      variations.push(keywords.join(' '));
    }
    
    // Add partial keyword searches
    if (keywords.length > 2) {
      variations.push(keywords.slice(0, Math.ceil(keywords.length / 2)).join(' '));
    }
    
    return [...new Set(variations)]; // Remove duplicates
  }

  private static calculateConfidence(query: string, keywords: string[]): number {
    let confidence = 0.5; // Base confidence
    
    // Longer queries tend to be more specific
    if (query.length > 20) confidence += 0.2;
    if (query.length > 50) confidence += 0.1;
    
    // More keywords indicate better specificity
    if (keywords.length > 3) confidence += 0.1;
    if (keywords.length > 6) confidence += 0.1;
    
    // Question format indicates clear intent
    if (query.includes('?')) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
}
