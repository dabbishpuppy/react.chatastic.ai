
import { RAGChatProcessor } from './chatIntegration/ragChatProcessor';
import { RAGStreamingProcessor } from './chatIntegration/ragStreamingProcessor';
import { RAGUtilities } from './chatIntegration/ragUtilities';

export interface ChatRAGOptions {
  enableRAG?: boolean;
  maxSources?: number;
  enableStreaming?: boolean;
  enableAdvancedFiltering?: boolean;
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
    return RAGChatProcessor.processMessageWithRAG(message, agentId, conversationId, options);
  }

  static async processStreamingMessageWithRAG(
    message: string,
    agentId: string,
    onChunk: (chunk: string) => void,
    onComplete: (result: ChatRAGResult) => void,
    conversationId?: string,
    options: ChatRAGOptions = {}
  ): Promise<void> {
    return RAGStreamingProcessor.processStreamingMessageWithRAG(
      message, 
      agentId, 
      onChunk, 
      onComplete, 
      conversationId, 
      options
    );
  }

  static async quickRAGResponse(
    message: string,
    agentId: string,
    maxSources: number = 3
  ): Promise<string> {
    return RAGUtilities.quickRAGResponse(message, agentId, maxSources);
  }

  static shouldEnableRAG(message: string, agentId: string): boolean {
    return RAGUtilities.shouldEnableRAG(message, agentId);
  }
}
