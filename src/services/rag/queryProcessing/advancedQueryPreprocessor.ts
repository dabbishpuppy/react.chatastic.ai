
import { QueryContext, QueryPreprocessingResult } from './queryPreprocessor';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationContext {
  conversationId: string;
  recentMessages: Array<{
    content: string;
    isAgent: boolean;
    timestamp: string;
  }>;
  topics: string[];
  entities: string[];
}

export interface AdvancedQueryAnalysis {
  intentConfidence: number;
  complexity: 'simple' | 'moderate' | 'complex';
  requiresContext: boolean;
  suggestedFilters: {
    sourceTypes?: string[];
    timeRange?: { start: Date; end: Date };
    topics?: string[];
  };
  conversationContext?: ConversationContext;
}

export class AdvancedQueryPreprocessor {
  static async analyzeQuery(
    query: string,
    agentId: string,
    conversationId?: string
  ): Promise<AdvancedQueryAnalysis> {
    console.log('🧠 Performing advanced query analysis:', {
      query: query.substring(0, 50) + '...',
      agentId,
      conversationId
    });

    try {
      // Analyze query complexity
      const complexity = this.analyzeComplexity(query);
      
      // Determine if conversation context is needed
      const requiresContext = this.requiresConversationContext(query);
      
      // Get conversation context if available
      let conversationContext: ConversationContext | undefined;
      if (conversationId && requiresContext) {
        conversationContext = await this.getConversationContext(conversationId);
      }
      
      // Suggest intelligent filters
      const suggestedFilters = this.suggestFilters(query, conversationContext);
      
      // Calculate intent confidence
      const intentConfidence = this.calculateIntentConfidence(query, conversationContext);

      const analysis: AdvancedQueryAnalysis = {
        intentConfidence,
        complexity,
        requiresContext,
        suggestedFilters,
        conversationContext
      };

      console.log('✅ Advanced query analysis complete:', {
        complexity,
        intentConfidence,
        requiresContext,
        suggestedFilters: Object.keys(suggestedFilters)
      });

      return analysis;
    } catch (error) {
      console.error('❌ Advanced query analysis failed:', error);
      // Return fallback analysis
      return {
        intentConfidence: 0.5,
        complexity: 'moderate',
        requiresContext: false,
        suggestedFilters: {}
      };
    }
  }

  private static analyzeComplexity(query: string): 'simple' | 'moderate' | 'complex' {
    const words = query.split(' ').length;
    const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;
    const hasConjunctions = /\b(and|or|but|however|moreover|furthermore)\b/i.test(query);
    
    if (words > 20 || hasMultipleQuestions || hasConjunctions) {
      return 'complex';
    } else if (words > 8 || query.includes('?')) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }

  private static requiresConversationContext(query: string): boolean {
    const contextIndicators = [
      'this', 'that', 'it', 'they', 'them', 'previous', 'before', 'earlier',
      'above', 'mentioned', 'discussed', 'said', 'told', 'explain more',
      'continue', 'expand', 'elaborate', 'follow up'
    ];
    
    const queryLower = query.toLowerCase();
    return contextIndicators.some(indicator => queryLower.includes(indicator));
  }

  private static async getConversationContext(conversationId: string): Promise<ConversationContext> {
    try {
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('content, is_agent, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!messages) {
        return {
          conversationId,
          recentMessages: [],
          topics: [],
          entities: []
        };
      }

      const recentMessages = messages.map(msg => ({
        content: msg.content,
        isAgent: msg.is_agent,
        timestamp: msg.created_at
      }));

      // Extract topics and entities from recent messages
      const topics = this.extractTopics(recentMessages);
      const entities = this.extractEntities(recentMessages);

      return {
        conversationId,
        recentMessages,
        topics,
        entities
      };
    } catch (error) {
      console.error('❌ Failed to get conversation context:', error);
      return {
        conversationId,
        recentMessages: [],
        topics: [],
        entities: []
      };
    }
  }

  private static extractTopics(messages: ConversationContext['recentMessages']): string[] {
    // Simple topic extraction based on common patterns
    const topicKeywords = new Set<string>();
    
    messages.forEach(msg => {
      const words = msg.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 4 && !this.isStopWord(word)) {
          topicKeywords.add(word);
        }
      });
    });

    return Array.from(topicKeywords).slice(0, 10);
  }

  private static extractEntities(messages: ConversationContext['recentMessages']): string[] {
    // Simple entity extraction (capitalized words, dates, numbers)
    const entities = new Set<string>();
    
    messages.forEach(msg => {
      // Extract capitalized words (potential proper nouns)
      const capitalizedWords = msg.content.match(/\b[A-Z][a-z]+\b/g);
      if (capitalizedWords) {
        capitalizedWords.forEach(word => entities.add(word));
      }

      // Extract dates
      const dates = msg.content.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g);
      if (dates) {
        dates.forEach(date => entities.add(date));
      }
    });

    return Array.from(entities).slice(0, 15);
  }

  private static suggestFilters(
    query: string,
    conversationContext?: ConversationContext
  ): AdvancedQueryAnalysis['suggestedFilters'] {
    const filters: AdvancedQueryAnalysis['suggestedFilters'] = {};

    // Suggest source types based on query content
    const queryLower = query.toLowerCase();
    if (queryLower.includes('document') || queryLower.includes('file') || queryLower.includes('pdf')) {
      filters.sourceTypes = ['file'];
    } else if (queryLower.includes('website') || queryLower.includes('page') || queryLower.includes('link')) {
      filters.sourceTypes = ['website'];
    } else if (queryLower.includes('question') || queryLower.includes('answer') || queryLower.includes('faq')) {
      filters.sourceTypes = ['qa'];
    }

    // Suggest time range based on temporal indicators
    if (queryLower.includes('recent') || queryLower.includes('latest') || queryLower.includes('new')) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filters.timeRange = { start: thirtyDaysAgo, end: new Date() };
    }

    // Use conversation context for topic suggestions
    if (conversationContext?.topics && conversationContext.topics.length > 0) {
      filters.topics = conversationContext.topics.slice(0, 5);
    }

    return filters;
  }

  private static calculateIntentConfidence(
    query: string,
    conversationContext?: ConversationContext
  ): number {
    let confidence = 0.5; // Base confidence

    // Clear question format increases confidence
    if (query.includes('?')) confidence += 0.2;
    
    // Specific keywords increase confidence
    const specificKeywords = ['how', 'what', 'when', 'where', 'why', 'who', 'explain', 'describe'];
    if (specificKeywords.some(keyword => query.toLowerCase().includes(keyword))) {
      confidence += 0.15;
    }

    // Conversation context increases confidence
    if (conversationContext && conversationContext.recentMessages.length > 0) {
      confidence += 0.1;
    }

    // Query length affects confidence
    const words = query.split(' ').length;
    if (words >= 5 && words <= 15) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could'
    ]);
    return stopWords.has(word.toLowerCase());
  }
}
