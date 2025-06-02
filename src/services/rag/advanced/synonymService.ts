
import { QueryExpansion } from './types';
import { ExpansionStrategy } from './expansionStrategies';

export class SynonymService {
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

  static applySynonymExpansion(
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

  static getSynonymMap(): Record<string, string[]> {
    return { ...this.SYNONYM_MAP };
  }
}
