
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MultiProviderLLMService, LLMRequest } from '@/services/rag/llm/multiProviderLLMService';

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
      // Get agent's AI configuration
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('ai_model, ai_instructions, ai_temperature')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        console.error('Error fetching agent configuration:', agentError);
        throw new Error('Failed to load agent configuration');
      }

      // Build conversation history for context
      const conversationMessages = messages
        .slice(-5) // Keep last 5 messages for context
        .map(msg => ({
          role: msg.isAgent ? 'assistant' as const : 'user' as const,
          content: msg.content
        }));

      // Add system message with agent instructions
      const llmMessages = [
        {
          role: 'system' as const,
          content: agent.ai_instructions || 'You are a helpful AI assistant.'
        },
        ...conversationMessages,
        {
          role: 'user' as const,
          content: content
        }
      ];

      // Create LLM request
      const request: LLMRequest = {
        model: agent.ai_model || 'gpt-4o-mini',
        messages: llmMessages,
        temperature: agent.ai_temperature || 0.7,
        max_tokens: 1000
      };

      // Call the LLM service
      const response = await MultiProviderLLMService.callLLM(request);

      // Create response message
      const responseMessage: Message = {
        id: Date.now().toString() + '_response',
        content: response.content,
        isAgent: true,
        timestamp: new Date().toISOString()
      };

      onNewMessage(responseMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      
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
