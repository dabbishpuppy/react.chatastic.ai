
import { ConversationMemory, ContextualQuery } from './types';
import { ConversationContextAnalyzer } from './contextAnalyzer';

export class ConversationQueryEnhancer {
  static createExpandedQuery(
    originalQuery: string,
    contextReferences: string[],
    relevantHistory: string[],
    implicitIntents: string[]
  ): string {
    let expandedQuery = originalQuery;

    // Add relevant context
    if (relevantHistory.length > 0) {
      expandedQuery += ` Context: ${relevantHistory[0].substring(0, 100)}`;
    }

    // Add intent clarification
    if (implicitIntents.includes('seeking_elaboration')) {
      expandedQuery += ' (detailed explanation requested)';
    }

    if (implicitIntents.includes('comparison_request')) {
      expandedQuery += ' (comparison analysis requested)';
    }

    return expandedQuery;
  }

  static async enhanceQueryWithContext(
    query: string,
    memory: ConversationMemory | null
  ): Promise<ContextualQuery> {
    console.log('🎯 Enhancing query with context:', { query: query.substring(0, 50) + '...' });

    try {
      const contextualQuery: ContextualQuery = {
        originalQuery: query,
        expandedQuery: query,
        contextReferences: [],
        implicitIntents: [],
        relevantHistory: [],
        confidence: 1.0
      };

      if (!memory || memory.messageHistory.length === 0) {
        return contextualQuery;
      }

      // Analyze query for context references
      const contextReferences = ConversationContextAnalyzer.findContextReferences(query, memory);
      contextualQuery.contextReferences = contextReferences;

      // Expand query with relevant history
      const relevantHistory = ConversationContextAnalyzer.findRelevantHistory(query, memory);
      contextualQuery.relevantHistory = relevantHistory;

      // Detect implicit intents
      const implicitIntents = ConversationContextAnalyzer.detectImplicitIntents(query, memory);
      contextualQuery.implicitIntents = implicitIntents;

      // Create expanded query
      contextualQuery.expandedQuery = this.createExpandedQuery(
        query,
        contextReferences,
        relevantHistory,
        implicitIntents
      );

      // Calculate confidence based on context richness
      contextualQuery.confidence = ConversationContextAnalyzer.calculateContextConfidence(
        contextReferences.length,
        relevantHistory.length,
        implicitIntents.length
      );

      console.log('✅ Query enhancement complete:', {
        expandedLength: contextualQuery.expandedQuery.length,
        confidence: contextualQuery.confidence,
        contextReferences: contextReferences.length
      });

      return contextualQuery;

    } catch (error) {
      console.error('❌ Failed to enhance query with context:', error);
      return {
        originalQuery: query,
        expandedQuery: query,
        contextReferences: [],
        implicitIntents: [],
        relevantHistory: [],
        confidence: 0.5
      };
    }
  }
}
