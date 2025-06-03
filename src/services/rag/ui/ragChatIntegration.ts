
import { RAGChatProcessor } from './chatIntegration/ragChatProcessor';

export interface ChatRAGOptions {
  enableRAG?: boolean;
  maxSources?: number;
  enableStreaming?: boolean;
  customSystemPrompt?: string;
}

export interface ChatRAGResult {
  response: string;
  sources?: Array<{
    id: string;
    name: string;
    type: string;
    relevance: number;
  }>;
  processingMetadata?: {
    totalTime: number;
    ragEnabled: boolean;
    sourcesUsed: number;
  };
}

export class RAGChatIntegration {
  static async processMessageWithRAG(
    message: string,
    agentId: string,
    conversationId?: string,
    options: ChatRAGOptions = {}
  ): Promise<ChatRAGResult> {
    console.log('🤖 RAGChatIntegration: Processing message with agent-configured AI model');
    
    return await RAGChatProcessor.processMessageWithRAG(
      message,
      agentId,
      conversationId,
      options
    );
  }
}
