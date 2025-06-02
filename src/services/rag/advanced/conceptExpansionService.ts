
import { QueryExpansion } from './types';
import { ExpansionStrategy } from './expansionStrategies';

export class ConceptExpansionService {
  static applyConceptBroadening(
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

  static getConceptMappings(): Record<string, string[]> {
    return {
      'api_integration': ['technical implementation', 'development', 'programming'],
      'user_customer': ['experience', 'interface', 'interaction'],
      'data_information': ['analytics', 'storage', 'processing'],
      'security_privacy': ['authentication', 'encryption', 'compliance']
    };
  }
}
