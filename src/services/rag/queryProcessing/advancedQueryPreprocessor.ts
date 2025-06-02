
import { QueryPreprocessor, QueryContext, QueryPreprocessingResult } from './queryPreprocessor';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationContext {
  previousQueries: string[];
  conversationFlow: Array<{
    query: string;
    response: string;
    timestamp: string;
    topics: string[];
  }>;
  userPreferences: {
    responseStyle: 'concise' | 'detailed' | 'technical';
    preferredSources: string[];
    excludedTopics: string[];
  };
}

export interface AdvancedQueryAnalysis {
  intentConfidence: number;
  topicCategories: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
  complexityScore: number;
  requiredContext: string[];
  suggestedFilters: {
    sourceTypes: string[];
    dateRange?: { start: Date; end: Date };
    relevanceThreshold: number;
  };
}

export class AdvancedQueryPreprocessor extends QueryPreprocessor {
  static async preprocessQueryWithContext(
    query: string,
    agentId: string,
    conversationId?: string,
    conversationContext?: ConversationContext
  ): Promise<QueryPreprocessingResult & { 
    analysis: AdvancedQueryAnalysis;
    conversationContext?: ConversationContext;
  }> {
    console.log('🔍 Advanced query preprocessing:', {
      query: query.substring(0, 50) + '...',
      hasContext: !!conversationContext
    });

    // Get basic preprocessing
    const basicResult = await this.preprocessQuery(query, agentId, conversationId);

    // Perform advanced analysis
    const analysis = this.performAdvancedAnalysis(query, conversationContext);

    // Enhance context with conversation history
    const enhancedContext = await this.enhanceWithConversationContext(
      basicResult.context,
      conversationContext,
      conversationId
    );

    // Generate contextual search queries
    const contextualQueries = this.generateContextualSearchQueries(
      query,
      basicResult.searchQueries,
      analysis,
      conversationContext
    );

    console.log('✅ Advanced preprocessing complete:', {
      intentConfidence: analysis.intentConfidence,
      complexityScore: analysis.complexityScore,
      contextualQueries: contextualQueries.length
    });

    return {
      ...basicResult,
      context: enhancedContext,
      searchQueries: contextualQueries,
      analysis,
      conversationContext
    };
  }

  private static performAdvancedAnalysis(
    query: string,
    conversationContext?: ConversationContext
  ): AdvancedQueryAnalysis {
    const words = query.toLowerCase().split(' ');
    
    // Detect intent confidence
    const questionIndicators = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'is', 'are'];
    const actionIndicators = ['create', 'make', 'build', 'show', 'help', 'find', 'explain'];
    
    const hasQuestionWords = words.some(word => questionIndicators.includes(word));
    const hasActionWords = words.some(word => actionIndicators.includes(word));
    const hasQuestionMark = query.includes('?');
    
    let intentConfidence = 0.5;
    if (hasQuestionWords || hasQuestionMark) intentConfidence += 0.3;
    if (hasActionWords) intentConfidence += 0.2;
    if (query.length > 20) intentConfidence += 0.1;

    // Detect topic categories
    const topicCategories = this.detectTopicCategories(words);

    // Assess urgency
    const urgencyIndicators = ['urgent', 'immediately', 'asap', 'quickly', 'now', 'emergency'];
    const urgencyLevel = words.some(word => urgencyIndicators.includes(word)) ? 'high' : 'medium';

    // Calculate complexity
    const complexityScore = Math.min(
      0.3 + (words.length / 50) + (topicCategories.length / 10),
      1.0
    );

    // Determine required context
    const requiredContext = this.determineRequiredContext(words, conversationContext);

    // Suggest filters
    const suggestedFilters = {
      sourceTypes: this.suggestSourceTypes(topicCategories),
      relevanceThreshold: complexityScore > 0.7 ? 0.8 : 0.6
    };

    return {
      intentConfidence,
      topicCategories,
      urgencyLevel,
      complexityScore,
      requiredContext,
      suggestedFilters
    };
  }

  private static detectTopicCategories(words: string[]): string[] {
    const topicMap: Record<string, string[]> = {
      'technical': ['api', 'code', 'programming', 'development', 'software', 'system'],
      'business': ['sales', 'revenue', 'customer', 'marketing', 'strategy', 'growth'],
      'support': ['help', 'issue', 'problem', 'error', 'bug', 'troubleshoot'],
      'product': ['feature', 'functionality', 'product', 'service', 'offering'],
      'data': ['analytics', 'report', 'metrics', 'data', 'statistics', 'numbers']
    };

    const categories: string[] = [];
    for (const [category, keywords] of Object.entries(topicMap)) {
      if (keywords.some(keyword => words.includes(keyword))) {
        categories.push(category);
      }
    }

    return categories.length > 0 ? categories : ['general'];
  }

  private static determineRequiredContext(
    words: string[],
    conversationContext?: ConversationContext
  ): string[] {
    const context: string[] = [];

    // Check for references to previous conversation
    const referenceWords = ['this', 'that', 'previous', 'earlier', 'above', 'before'];
    if (referenceWords.some(word => words.includes(word))) {
      context.push('conversation_history');
    }

    // Check for comparison requests
    const comparisonWords = ['compare', 'difference', 'versus', 'vs', 'better', 'best'];
    if (comparisonWords.some(word => words.includes(word))) {
      context.push('comparative_data');
    }

    // Check for temporal references
    const timeWords = ['recent', 'latest', 'current', 'today', 'yesterday', 'last'];
    if (timeWords.some(word => words.includes(word))) {
      context.push('temporal_data');
    }

    return context;
  }

  private static suggestSourceTypes(topicCategories: string[]): string[] {
    const sourceTypeMap: Record<string, string[]> = {
      'technical': ['documentation', 'api_docs', 'code_examples'],
      'business': ['reports', 'presentations', 'case_studies'],
      'support': ['faq', 'troubleshooting', 'user_guides'],
      'product': ['product_docs', 'feature_specs', 'user_manuals'],
      'data': ['analytics', 'reports', 'dashboards']
    };

    const suggestedTypes = new Set<string>();
    for (const category of topicCategories) {
      if (sourceTypeMap[category]) {
        sourceTypeMap[category].forEach(type => suggestedTypes.add(type));
      }
    }

    return suggestedTypes.size > 0 ? Array.from(suggestedTypes) : ['text', 'document'];
  }

  private static async enhanceWithConversationContext(
    context: QueryContext,
    conversationContext?: ConversationContext,
    conversationId?: string
  ): Promise<QueryContext> {
    if (!conversationContext && conversationId) {
      // Fetch conversation context from database
      try {
        const { data: messages } = await supabase
          .from('conversation_messages')
          .select('content, is_agent, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (messages) {
          conversationContext = this.buildConversationContext(messages);
        }
      } catch (error) {
        console.warn('Failed to fetch conversation context:', error);
      }
    }

    return {
      ...context,
      conversationHistory: conversationContext?.conversationFlow || [],
      userPreferences: conversationContext?.userPreferences
    };
  }

  private static buildConversationContext(messages: any[]): ConversationContext {
    const conversationFlow = messages
      .filter(msg => !msg.is_agent)
      .slice(0, 5)
      .map(msg => ({
        query: msg.content,
        response: '',
        timestamp: msg.created_at,
        topics: this.detectTopicCategories(msg.content.toLowerCase().split(' '))
      }));

    return {
      previousQueries: conversationFlow.map(flow => flow.query),
      conversationFlow,
      userPreferences: {
        responseStyle: 'detailed',
        preferredSources: [],
        excludedTopics: []
      }
    };
  }

  private static generateContextualSearchQueries(
    originalQuery: string,
    basicQueries: string[],
    analysis: AdvancedQueryAnalysis,
    conversationContext?: ConversationContext
  ): string[] {
    const queries = [...basicQueries];

    // Add topic-specific queries
    for (const topic of analysis.topicCategories) {
      queries.push(`${originalQuery} ${topic}`);
    }

    // Add context-aware queries if conversation history exists
    if (conversationContext?.previousQueries.length) {
      const recentQuery = conversationContext.previousQueries[0];
      queries.push(`${recentQuery} ${originalQuery}`);
    }

    // Add complexity-based variations
    if (analysis.complexityScore > 0.7) {
      queries.push(`detailed explanation ${originalQuery}`);
      queries.push(`comprehensive guide ${originalQuery}`);
    }

    return [...new Set(queries)]; // Remove duplicates
  }
}
