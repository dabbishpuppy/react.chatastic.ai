
import { useState } from 'react';
import { RAGChatIntegration } from '@/services/rag/ui/ragChatIntegration';

export interface Message {
  id: string;
  content: string;
  isAgent: boolean;
  timestamp: string;
}

export const useMessageHandling = (agentId: string) => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (
    content: string,
    messages: Message[],
    onNewMessage: (message: Message) => void
  ): Promise<void> => {
    setIsLoading(true);

    try {
      console.log('🧠 Processing message with RAG system for agent:', agentId);

      // Process with RAG integration
      const ragResult = await RAGChatIntegration.processMessageWithRAG(
        content,
        agentId,
        undefined, // No conversation ID in this context
        {
          enableRAG: true,
          maxSources: 5,
          enableStreaming: false
        }
      );

      console.log('🎯 RAG processing complete:', {
        responseLength: ragResult.response.length,
        sourcesUsed: ragResult.processingMetadata?.sourcesUsed || 0,
        processingTime: ragResult.processingMetadata?.totalTime || 0
      });

      // Create response message
      const responseMessage: Message = {
        id: Date.now().toString() + '_response',
        content: ragResult.response,
        isAgent: true,
        timestamp: new Date().toISOString()
      };

      onNewMessage(responseMessage);
    } catch (error) {
      console.error('❌ RAG processing failed:', error);
      
      // Fallback error message
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        content: 'I apologize, but I encountered an error while processing your message. Please try again.',
        isAgent: true,
        timestamp: new Date().toISOString()
      };

      onNewMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading
  };
};
