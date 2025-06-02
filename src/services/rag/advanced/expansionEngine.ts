
import { QueryExpansion } from './types';
import { ContextualQuery } from './conversationContextManager';
import { ExpansionStrategy } from './expansionStrategies';

export class ExpansionEngine {
  static applyContextInjection(
    expansion: QueryExpansion,
    contextualQuery: ContextualQuery,
    strategy: ExpansionStrategy
  ): void {
    if (contextualQuery.expandedQuery !== contextualQuery.originalQuery) {
      expansion.expandedQueries.push(contextualQuery.expandedQuery);
    }

    // Add context-aware variations
    if (contextualQuery.relevantHistory.length > 0) {
      const contextQuery = `${expansion.originalQuery} (context: ${contextualQuery.relevantHistory[0].substring(0, 50)})`;
      expansion.expandedQueries.push(contextQuery);
    }
  }

  static applyIntentClarification(
    expansion: QueryExpansion,
    contextualQuery: ContextualQuery,
    strategy: ExpansionStrategy
  ): void {
    contextualQuery.implicitIntents.forEach(intent => {
      let clarifiedQuery = expansion.originalQuery;
      
      switch (intent) {
        case 'seeking_elaboration':
          clarifiedQuery += ' detailed explanation';
          break;
        case 'comparison_request':
          clarifiedQuery += ' comparison analysis';
          break;
        case 'clarification_needed':
          clarifiedQuery += ' clear explanation';
          break;
      }
      
      if (clarifiedQuery !== expansion.originalQuery) {
        expansion.expandedQueries.push(clarifiedQuery);
      }
    });
  }

  static calculateExpansionConfidence(
    expansion: QueryExpansion,
    contextualQuery: ContextualQuery | null
  ): number {
    let confidence = 0.5;
    
    // Boost confidence based on number of expansions
    const expansionBoost = Math.min((expansion.expandedQueries.length - 1) * 0.1, 0.3);
    confidence += expansionBoost;
    
    // Boost confidence based on synonym matches
    const synonymBoost = Math.min(Object.keys(expansion.synonyms).length * 0.05, 0.2);
    confidence += synonymBoost;
    
    // Boost confidence based on context
    if (contextualQuery && contextualQuery.confidence > 0.7) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }
}
