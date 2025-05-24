
import { useEffect, useRef } from "react";
import { ChatMessage } from "@/types/chatInterface";
import { useChatSettings } from "./useChatSettings";
import { checkRateLimit, recordMessage } from "@/utils/rateLimitUtils";

export const useSharedChatLogic = (agentId?: string) => {
  const { settings } = useChatSettings();
  const inputRef = useRef<HTMLInputElement>(null);

  // Shared message handling logic
  const handleMessageSubmission = async (
    message: string,
    onSuccess: (userMessage: ChatMessage) => void,
    onRateLimit: (error: string, timeUntilReset?: number) => void
  ) => {
    if (!message.trim()) return;

    // Check rate limit if agentId is provided
    if (agentId) {
      try {
        const rateLimitStatus = await checkRateLimit(agentId);
        
        if (rateLimitStatus.exceeded) {
          onRateLimit(
            rateLimitStatus.message || 'Too many messages in a row',
            rateLimitStatus.timeUntilReset
          );
          return;
        }
        
        // Record the message
        await recordMessage(agentId);
      } catch (error) {
        console.error('Rate limit check error:', error);
      }
    }

    // Create user message
    const userMessage: ChatMessage = {
      isAgent: false,
      content: message,
      timestamp: new Date().toISOString()
    };

    onSuccess(userMessage);
  };

  // Shared agent response simulation
  const generateAgentResponse = (userMessage: string): ChatMessage => {
    return {
      isAgent: true,
      content: "I'm here to help you with any questions or tasks!",
      timestamp: new Date().toISOString()
    };
  };

  // Focus input helper
  const focusInput = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  return {
    settings,
    inputRef,
    handleMessageSubmission,
    generateAgentResponse,
    focusInput
  };
};
