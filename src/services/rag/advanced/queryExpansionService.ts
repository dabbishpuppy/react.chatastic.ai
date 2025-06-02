import { ConversationContextManager, ContextualQuery } from './conversationContextManager';
import { QueryExpansion } from './types';

export interface ExpansionStrategy {
  name: string;
  enabled: boolean;
  weight: number;
  maxExpansions: number;
}

export class QueryExpansionService {
  private static readonly DEFAULT_STRATEGIES: Record<string, ExpansionStrategy> = {
    synonym_expansion: {
      name: 'Synonym Expansion',
      enabled: true,
      weight: 0.8,
      maxExpansions: 3
    },
    concept_broadening: {
      name: 'Concept Broadening',
      enabled: true,
      weight: 0.6,
      maxExpansions: 2
    },
    context_injection: {
      name: 'Context Injection',
      enabled: true,
      weight: 0.9,
      maxExpansions: 1
    },
    intent_clarification: {
      name: 'Intent Clarification',
      enabled: true,
      weight: 0.7,
      maxExpansions: 2
    }
  };

  // Simple synonym mapping (in production, would use external API)
  private static readonly SYNONYM_MAP: Record<string, string[]> = {
    'help': ['assist', 'support', 'aid', 'guide'],
    'information': ['data', 'details', 'facts', 'knowledge'],
    'problem': ['issue', 'difficulty', 'trouble', 'challenge'],
    'solution': ['answer', 'resolution', 'fix', 'remedy'],
    'quick': ['fast', 'rapid', 'swift', 'speedy'],
    'simple': ['easy', 'basic', 'straightforward', 'uncomplicated'],
    'important': ['crucial', 'vital', 'essential', 'significant'],
    'different': ['various', 'distinct', 'alternative', 'diverse'],
    'best': ['optimal', 'ideal', 'top', 'excellent'],
    'new': ['recent', 'latest', 'modern', 'current']
  };

  static async expandQuery(
    query: string,
    agentId: string,
    conversationId?: string,
    strategies?: Partial<Record<string, ExpansionStrategy>>
  ): Promise<QueryExpansion> {
    console.log('🔍 Expanding query:', { query: query.substring(0, 50) + '...' });

    const activeStrategies = { ...this.DEFAULT_STRATEGIES, ...strategies };
    
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
        this.applySynonymExpansion(expansion, activeStrategies.synonym_expansion);
      }

      if (activeStrategies.concept_broadening.enabled) {
        this.applyConceptBroadening(expansion, activeStrategies.concept_broadening);
      }

      if (activeStrategies.context_injection.enabled && contextualQuery) {
        this.applyContextInjection(expansion, contextualQuery, activeStrategies.context_injection);
      }

      if (activeStrategies.intent_clarification.enabled && contextualQuery) {
        this.applyIntentClarification(expansion, contextualQuery, activeStrategies.intent_clarification);
      }

      // Calculate overall confidence
      expansion.confidence = this.calculateExpansionConfidence(expansion, contextualQuery);

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

  private static applySynonymExpansion(
    expansion: QueryExpansion,
    strategy: ExpansionStrategy
  ): void {
    const words = expansion.originalQuery.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (this.SYNONYM_MAP[cleanWord]) {
        expansion.synonyms[cleanWord] = this.SYNONYM_MAP[cleanWord];
        
        // Create expanded queries with synonyms
        const synonymQueries = this.SYNONYM_MAP[cleanWord]
          .slice(0, strategy.maxExpansions)
          .map(synonym => 
            expansion.originalQuery.replace(new RegExp(`\\b${cleanWord}\\b`, 'gi'), synonym)
          );
        
        expansion.expandedQueries.push(...synonymQueries);
      }
    });
  }

  private static applyConceptBroadening(
    expansion: QueryExpansion,
    strategy: ExpansionStrategy
  ): void {
    const query = expansion.originalQuery.toLowerCase();
    
    // Technical concept broadening
    if (query.includes('api') || query.includes('integration')) {
      expansion.relatedConcepts.push('technical implementation', 'development', 'programming');
    }
    
    if (query.includes('user') || query.includes('customer')) {
      expansion.relatedConcepts.push('experience', 'interface', 'interaction');
    }
    
    if (query.includes('data') || query.includes('information')) {
      expansion.relatedConcepts.push('analytics', 'storage', 'processing');
    }
    
    if (query.includes('security') || query.includes('privacy')) {
      expansion.relatedConcepts.push('authentication', 'encryption', 'compliance');
    }

    // Add concept-broadened queries
    expansion.relatedConcepts.slice(0, strategy.maxExpansions).forEach(concept => {
      expansion.expandedQueries.push(`${expansion.originalQuery} ${concept}`);
    });
  }

  private static applyContextInjection(
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

  private static applyIntentClarification(
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

  private static calculateExpansionConfidence(
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
    return { ...this.DEFAULT_STRATEGIES };
  }

  static updateExpansionStrategy(
    strategyName: string,
    updates: Partial<ExpansionStrategy>
  ): boolean {
    if (this.DEFAULT_STRATEGIES[strategyName]) {
      Object.assign(this.DEFAULT_STRATEGIES[strategyName], updates);
      return true;
    }
    return false;
  }
}
