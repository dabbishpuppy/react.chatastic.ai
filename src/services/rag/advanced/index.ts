
// Export advanced RAG processing services
export { ConversationContextManager } from './conversationContextManager';
export { QueryExpansionService } from './queryExpansionService';
export { IntelligentRoutingService } from './intelligentRoutingService';
export { IntentAnalyzer } from './intentAnalyzer';
export { RoutingDecisionMaker } from './routingDecisionMaker';

// Export expansion services
export { ExpansionStrategiesManager } from './expansionStrategies';
export { SynonymService } from './synonymService';
export { ConceptExpansionService } from './conceptExpansionService';
export { ExpansionEngine } from './expansionEngine';

// Export conversation services
export { ConversationMemoryManager } from './conversation/memoryManager';
export { ConversationContextAnalyzer } from './conversation/contextAnalyzer';
export { ConversationQueryEnhancer } from './conversation/queryEnhancer';

// Export types - organized by module
export type { 
  ConversationMemory, 
  ContextualQuery,
  ContextAnalysisConfig
} from './conversation/types';

export type { 
  ExpansionStrategy 
} from './expansionStrategies';

export type { 
  QueryIntent, 
  RoutingDecision, 
  QueryAnalysis,
  QueryExpansion
} from './types';
