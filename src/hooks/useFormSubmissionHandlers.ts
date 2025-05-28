
import React from "react";

interface UseFormSubmissionHandlersProps {
  message: string;
  isTyping: boolean;
  rateLimitError: string | null;
  isSubmitting: boolean;
  submitMessage: (text: string, agentId?: string) => Promise<void>;
  inputRef: React.RefObject<HTMLInputElement>;
  isEmbedded: boolean;
}

export const useFormSubmissionHandlers = ({
  message,
  isTyping,
  rateLimitError,
  isSubmitting,
  submitMessage,
  inputRef,
  isEmbedded
}: UseFormSubmissionHandlersProps) => {

  const handleSubmit = async (e: React.FormEvent, submitAgentId?: string) => {
    e.preventDefault();
    
    if (!message.trim() || isTyping || rateLimitError || isSubmitting) {
      console.log('🚫 Submit blocked:', {
        emptyMessage: !message.trim(),
        isTyping,
        rateLimitError: !!rateLimitError,
        isSubmitting
      });
      return;
    }

    const messageToSend = message.trim();
    await submitMessage(messageToSend, submitAgentId);
    
    if (isEmbedded) {
      e.stopPropagation();
    }
  };

  const handleSuggestedMessageClick = async (text: string, submitAgentId?: string) => {
    if (isTyping || rateLimitError || isSubmitting) {
      console.log('🚫 Suggested message click blocked:', {
        isTyping,
        rateLimitError: !!rateLimitError,
        isSubmitting
      });
      return;
    }
    
    await submitMessage(text, submitAgentId);
    
    // Focus input field after suggested message click
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  return {
    handleSubmit,
    handleSuggestedMessageClick
  };
};
