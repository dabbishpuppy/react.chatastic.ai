
export interface ConversationMemory {
  conversationId: string;
  agentId: string;
  messageHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  contextSummary: string;
  topics: string[];
  entities: string[];
  lastUpdated: Date;
}

export interface ContextualQuery {
  originalQuery: string;
  expandedQuery: string;
  contextReferences: string[];
  implicitIntents: string[];
  relevantHistory: string[];
  confidence: number;
}

export interface ContextAnalysisConfig {
  maxHistoryLength: number;
  contextWindowHours: number;
  maxTopics: number;
  maxRecentMessages: number;
}
