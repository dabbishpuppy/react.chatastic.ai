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

export class ConversationContextManager {
  private static memoryCache = new Map<string, ConversationMemory>();
  private static readonly MAX_HISTORY_LENGTH = 20;
  private static readonly CONTEXT_WINDOW_HOURS = 24;

  static async getConversationContext(
    conversationId: string,
    agentId: string
  ): Promise<ConversationMemory | null> {
    console.log('🧠 Retrieving conversation context:', { conversationId, agentId });

    // Check cache first
    const cached = this.memoryCache.get(conversationId);
    if (cached && this.isContextFresh(cached)) {
      return cached;
    }

    try {
      // In a real implementation, this would fetch from database
      const memory: ConversationMemory = {
        conversationId,
        agentId,
        messageHistory: [],
        contextSummary: '',
        topics: [],
        entities: [],
        lastUpdated: new Date()
      };

      this.memoryCache.set(conversationId, memory);
      return memory;
    } catch (error) {
      console.error('❌ Failed to retrieve conversation context:', error);
      return null;
    }
  }

  static async updateConversationContext(
    conversationId: string,
    userMessage: string,
    assistantResponse?: string
  ): Promise<void> {
    console.log('🔄 Updating conversation context:', conversationId);

    try {
      const memory = await this.getConversationContext(conversationId, 'default');
      if (!memory) return;

      // Add user message
      memory.messageHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Add assistant response if provided
      if (assistantResponse) {
        memory.messageHistory.push({
          role: 'assistant',
          content: assistantResponse,
          timestamp: new Date()
        });
      }

      // Trim history to max length
      if (memory.messageHistory.length > this.MAX_HISTORY_LENGTH) {
        memory.messageHistory = memory.messageHistory.slice(-this.MAX_HISTORY_LENGTH);
      }

      // Extract topics and entities
      await this.updateTopicsAndEntities(memory, userMessage);
      
      // Update summary
      await this.updateContextSummary(memory);
      
      memory.lastUpdated = new Date();
      this.memoryCache.set(conversationId, memory);

    } catch (error) {
      console.error('❌ Failed to update conversation context:', error);
    }
  }

  static async enhanceQueryWithContext(
    query: string,
    conversationId?: string,
    agentId?: string
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

      if (!conversationId || !agentId) {
        return contextualQuery;
      }

      const memory = await this.getConversationContext(conversationId, agentId);
      if (!memory || memory.messageHistory.length === 0) {
        return contextualQuery;
      }

      // Analyze query for context references
      const contextReferences = this.findContextReferences(query, memory);
      contextualQuery.contextReferences = contextReferences;

      // Expand query with relevant history
      const relevantHistory = this.findRelevantHistory(query, memory);
      contextualQuery.relevantHistory = relevantHistory;

      // Detect implicit intents
      const implicitIntents = this.detectImplicitIntents(query, memory);
      contextualQuery.implicitIntents = implicitIntents;

      // Create expanded query
      contextualQuery.expandedQuery = this.createExpandedQuery(
        query,
        contextReferences,
        relevantHistory,
        implicitIntents
      );

      // Calculate confidence based on context richness
      contextualQuery.confidence = this.calculateContextConfidence(
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

  private static isContextFresh(memory: ConversationMemory): boolean {
    const hoursSinceUpdate = (Date.now() - memory.lastUpdated.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate < this.CONTEXT_WINDOW_HOURS;
  }

  private static async updateTopicsAndEntities(
    memory: ConversationMemory,
    message: string
  ): Promise<void> {
    // Simple topic extraction (in production, would use NLP)
    const words = message.toLowerCase().split(/\s+/);
    const potentialTopics = words.filter(word => 
      word.length > 4 && 
      !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were'].includes(word)
    );

    // Add unique topics
    potentialTopics.forEach(topic => {
      if (!memory.topics.includes(topic)) {
        memory.topics.push(topic);
      }
    });

    // Keep only recent topics (max 10)
    if (memory.topics.length > 10) {
      memory.topics = memory.topics.slice(-10);
    }
  }

  private static async updateContextSummary(memory: ConversationMemory): Promise<void> {
    if (memory.messageHistory.length === 0) return;

    // Create a simple summary from recent messages and topics
    const recentMessages = memory.messageHistory.slice(-5);
    const summary = `Recent conversation about: ${memory.topics.slice(0, 3).join(', ')}. ` +
                   `Last discussed: ${recentMessages[recentMessages.length - 1]?.content.substring(0, 100)}...`;
    
    memory.contextSummary = summary;
  }

  private static findContextReferences(
    query: string,
    memory: ConversationMemory
  ): string[] {
    const references: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Look for pronouns and references
    const referenceWords = ['it', 'this', 'that', 'they', 'them', 'these', 'those'];
    referenceWords.forEach(ref => {
      if (lowerQuery.includes(ref)) {
        references.push(ref);
      }
    });

    // Look for topic references
    memory.topics.forEach(topic => {
      if (lowerQuery.includes(topic.toLowerCase())) {
        references.push(topic);
      }
    });

    return references;
  }

  private static findRelevantHistory(
    query: string,
    memory: ConversationMemory
  ): string[] {
    const relevantHistory: string[] = [];
    const queryWords = query.toLowerCase().split(/\s+/);

    // Find messages with word overlap
    memory.messageHistory.slice(-5).forEach(message => {
      const messageWords = message.content.toLowerCase().split(/\s+/);
      const overlap = queryWords.filter(word => 
        messageWords.includes(word) && word.length > 3
      );

      if (overlap.length >= 2) {
        relevantHistory.push(message.content.substring(0, 200));
      }
    });

    return relevantHistory;
  }

  private static detectImplicitIntents(
    query: string,
    memory: ConversationMemory
  ): string[] {
    const intents: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Detect follow-up questions
    if (lowerQuery.includes('more') || lowerQuery.includes('tell me') || lowerQuery.includes('explain')) {
      intents.push('seeking_elaboration');
    }

    // Detect comparison requests
    if (lowerQuery.includes('compare') || lowerQuery.includes('difference') || lowerQuery.includes('versus')) {
      intents.push('comparison_request');
    }

    // Detect clarification requests
    if (lowerQuery.includes('what do you mean') || lowerQuery.includes('clarify') || lowerQuery.includes('confused')) {
      intents.push('clarification_needed');
    }

    return intents;
  }

  private static createExpandedQuery(
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

  private static calculateContextConfidence(
    contextRefs: number,
    historyItems: number,
    intents: number
  ): number {
    const baseConfidence = 0.5;
    const contextBoost = Math.min(contextRefs * 0.1, 0.3);
    const historyBoost = Math.min(historyItems * 0.1, 0.3);
    const intentBoost = Math.min(intents * 0.05, 0.2);

    return Math.min(baseConfidence + contextBoost + historyBoost + intentBoost, 1.0);
  }

  // Clean up old conversations
  static cleanupOldConversations(): void {
    const cutoffTime = Date.now() - (this.CONTEXT_WINDOW_HOURS * 60 * 60 * 1000);
    
    for (const [conversationId, memory] of this.memoryCache.entries()) {
      if (memory.lastUpdated.getTime() < cutoffTime) {
        this.memoryCache.delete(conversationId);
      }
    }
  }
}
