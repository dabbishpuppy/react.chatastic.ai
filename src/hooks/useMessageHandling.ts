
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
    onNewMessage: (message: Message) => void,
    options?: {
      onThinkingStart?: () => void;
      onThinkingEnd?: () => void;
      onTypingStart?: (messageId: string) => void;
      onTypingComplete?: (messageId: string) => void;
    }
  ): Promise<void> => {
    setIsLoading(true);

    try {
      console.log('🧠 Processing message with RAG system for agent:', agentId);

      // Start thinking phase
      console.log('🤔 Starting thinking phase');
      options?.onThinkingStart?.();

      // Faster thinking delay (reduced from 600ms to 300ms)
      await new Promise(resolve => setTimeout(resolve, 300));

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

      // End thinking, start typing
      console.log('🤔 Ending thinking phase');
      options?.onThinkingEnd?.();

      // Create response message with crypto-generated UUID
      const messageId = crypto.randomUUID();
      const responseMessage: Message = {
        id: messageId,
        content: ragResult.response,
        isAgent: true,
        timestamp: new Date().toISOString()
      };

      // Start typing phase
      console.log('⌨️ Starting typing phase for message:', messageId);
      options?.onTypingStart?.(messageId);

      // Add message to chat
      onNewMessage(responseMessage);

      // Faster typing completion (reduced from 3ms per character to 2ms per character)
      setTimeout(() => {
        console.log('✅ Typing complete for message:', messageId);
        options?.onTypingComplete?.(messageId);
      }, ragResult.response.length * 2 + 100); // Very fast typing: 2ms per character + 100ms buffer

    } catch (error) {
      console.error('❌ RAG processing failed:', error);
      
      // End thinking on error
      options?.onThinkingEnd?.();
      
      // Fallback error message
      const errorMessageId = crypto.randomUUID();
      const errorMessage: Message = {
        id: errorMessageId,
        content: 'I apologize, but I encountered an error while processing your message. Please try again.',
        isAgent: true,
        timestamp: new Date().toISOString()
      };

      // Start typing for error message
      options?.onTypingStart?.(errorMessageId);
      onNewMessage(errorMessage);

      setTimeout(() => {
        options?.onTypingComplete?.(errorMessageId);
      }, 300); // Fast typing for error message too
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading
  };
};
