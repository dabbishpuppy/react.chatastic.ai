
import { ConversationContextManager, ContextualQuery } from './conversationContextManager';
import { QueryExpansion } from './types';
import { ExpansionStrategiesManager, ExpansionStrategy } from './expansionStrategies';
import { SynonymService } from './synonymService';
import { ConceptExpansionService } from './conceptExpansionService';
import { ExpansionEngine } from './expansionEngine';

export type { ExpansionStrategy } from './expansionStrategies';

export class QueryExpansionService {
  static async expandQuery(
    query: string,
    agentId: string,
    conversationId?: string,
    strategies?: Partial<Record<string, ExpansionStrategy>>
  ): Promise<QueryExpansion> {
    console.log('🔍 Expanding query:', { query: query.substring(0, 50) + '...' });

    const activeStrategies = ExpansionStrategiesManager.getActiveStrategies(strategies);
    
    try {
      // Get contextual enhancement first
      let contextualQuery: ContextualQuery | null = null;
      if (conversationId) {
        contextualQuery = await ConversationContextManager.enhanceQueryWithContext(
          query,
          conversationId,
          agentId
        );
      }

      const expansion: QueryExpansion = {
        originalQuery: query,
        expandedQueries: [query],
        synonyms: {},
        relatedConcepts: [],
        negativeTerms: [],
        confidence: 0.5
      };

      // Apply expansion strategies
      if (activeStrategies.synonym_expansion.enabled) {
        SynonymService.applySynonymExpansion(expansion, activeStrategies.synonym_expansion);
      }

      if (activeStrategies.concept_broadening.enabled) {
        ConceptExpansionService.applyConceptBroadening(expansion, activeStrategies.concept_broadening);
      }

      if (activeStrategies.context_injection.enabled && contextualQuery) {
        ExpansionEngine.applyContextInjection(expansion, contextualQuery, activeStrategies.context_injection);
      }

      if (activeStrategies.intent_clarification.enabled && contextualQuery) {
        ExpansionEngine.applyIntentClarification(expansion, contextualQuery, activeStrategies.intent_clarification);
      }

      // Calculate overall confidence
      expansion.confidence = ExpansionEngine.calculateExpansionConfidence(expansion, contextualQuery);

      console.log('✅ Query expansion complete:', {
        originalLength: query.length,
        expansions: expansion.expandedQueries.length,
        confidence: expansion.confidence
      });

      return expansion;

    } catch (error) {
      console.error('❌ Query expansion failed:', error);
      return {
        originalQuery: query,
        expandedQueries: [query],
        synonyms: {},
        relatedConcepts: [],
        negativeTerms: [],
        confidence: 0.3
      };
    }
  }

  static async expandMultipleQueries(
    queries: string[],
    agentId: string,
    conversationId?: string
  ): Promise<QueryExpansion[]> {
    console.log('🔍 Expanding multiple queries:', queries.length);
    
    const expansions = await Promise.all(
      queries.map(query => this.expandQuery(query, agentId, conversationId))
    );
    
    console.log('✅ Multiple query expansion complete');
    return expansions;
  }

  static getExpansionStrategies(): Record<string, ExpansionStrategy> {
    return ExpansionStrategiesManager.getExpansionStrategies();
  }

  static updateExpansionStrategy(
    strategyName: string,
    updates: Partial<ExpansionStrategy>
  ): boolean {
    return ExpansionStrategiesManager.updateExpansionStrategy(strategyName, updates);
  }
}
