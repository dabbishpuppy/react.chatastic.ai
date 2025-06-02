
import { ConversationMemory, ContextualQuery } from './conversation/types';
import { ConversationMemoryManager } from './conversation/memoryManager';
import { ConversationQueryEnhancer } from './conversation/queryEnhancer';

// Re-export types for backward compatibility
export type { ConversationMemory, ContextualQuery };

export class ConversationContextManager {
  static async getConversationContext(
    conversationId: string,
    agentId: string
  ): Promise<ConversationMemory | null> {
    return ConversationMemoryManager.getConversationMemory(conversationId, agentId);
  }

  static async updateConversationContext(
    conversationId: string,
    userMessage: string,
    assistantResponse?: string
  ): Promise<void> {
    return ConversationMemoryManager.updateConversationMemory(
      conversationId, 
      userMessage, 
      assistantResponse
    );
  }

  static async enhanceQueryWithContext(
    query: string,
    conversationId?: string,
    agentId?: string
  ): Promise<ContextualQuery> {
    let memory: ConversationMemory | null = null;
    
    if (conversationId && agentId) {
      memory = await ConversationMemoryManager.getConversationMemory(conversationId, agentId);
    }

    return ConversationQueryEnhancer.enhanceQueryWithContext(query, memory);
  }

  static cleanupOldConversations(): void {
    ConversationMemoryManager.cleanupOldMemories();
  }
}
