import { ConversationMemory, ContextAnalysisConfig } from './types';

export class ConversationMemoryManager {
  private static memoryCache = new Map<string, ConversationMemory>();
  
  private static readonly config: ContextAnalysisConfig = {
    maxHistoryLength: 20,
    contextWindowHours: 24,
    maxTopics: 10,
    maxRecentMessages: 5
  };

  static async getConversationMemory(
    conversationId: string,
    agentId: string
  ): Promise<ConversationMemory | null> {
    console.log('🧠 Retrieving conversation memory:', { conversationId, agentId });

    // Check cache first
    const cached = this.memoryCache.get(conversationId);
    if (cached && this.isMemoryFresh(cached)) {
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
      console.error('❌ Failed to retrieve conversation memory:', error);
      return null;
    }
  }

  static async updateConversationMemory(
    conversationId: string,
    userMessage: string,
    assistantResponse?: string
  ): Promise<void> {
    console.log('🔄 Updating conversation memory:', conversationId);

    try {
      const memory = await this.getConversationMemory(conversationId, 'default');
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
      if (memory.messageHistory.length > this.config.maxHistoryLength) {
        memory.messageHistory = memory.messageHistory.slice(-this.config.maxHistoryLength);
      }

      // Extract topics and entities
      await this.updateTopicsAndEntities(memory, userMessage);
      
      // Update summary
      await this.updateContextSummary(memory);
      
      memory.lastUpdated = new Date();
      this.memoryCache.set(conversationId, memory);

    } catch (error) {
      console.error('❌ Failed to update conversation memory:', error);
    }
  }

  static cleanupOldMemories(): void {
    const cutoffTime = Date.now() - (this.config.contextWindowHours * 60 * 60 * 1000);
    
    for (const [conversationId, memory] of this.memoryCache.entries()) {
      if (memory.lastUpdated.getTime() < cutoffTime) {
        this.memoryCache.delete(conversationId);
      }
    }
  }

  private static isMemoryFresh(memory: ConversationMemory): boolean {
    const hoursSinceUpdate = (Date.now() - memory.lastUpdated.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate < this.config.contextWindowHours;
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

    // Keep only recent topics
    if (memory.topics.length > this.config.maxTopics) {
      memory.topics = memory.topics.slice(-this.config.maxTopics);
    }
  }

  private static async updateContextSummary(memory: ConversationMemory): Promise<void> {
    if (memory.messageHistory.length === 0) return;

    // Create a simple summary from recent messages and topics
    const recentMessages = memory.messageHistory.slice(-this.config.maxRecentMessages);
    const summary = `Recent conversation about: ${memory.topics.slice(0, 3).join(', ')}. ` +
                   `Last discussed: ${recentMessages[recentMessages.length - 1]?.content.substring(0, 100)}...`;
    
    memory.contextSummary = summary;
  }
}
