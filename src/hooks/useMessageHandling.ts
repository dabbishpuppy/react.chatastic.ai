
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/types/chatInterface";
import { useChatState } from "./useChatState";
import { checkRateLimit, recordMessage } from "@/utils/rateLimitUtils";
import { 
  proceedWithMessage, 
  copyMessageToClipboard, 
  handleFeedback, 
  regenerateResponse, 
  insertEmoji 
} from "@/utils/messageUtils";

export const useMessageHandling = (
  initialMessages: ChatMessage[] = [],
  isEmbedded: boolean = false,
  conversationId?: string
) => {
  const {
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    setIsTyping,
    rateLimitError,
    setRateLimitError,
    timeUntilReset,
    setTimeUntilReset,
    isWaitingForRateLimit,
    setIsWaitingForRateLimit,
    userHasMessaged,
    setUserHasMessaged,
    inputRef,
    countdownIntervalRef
  } = useChatState(initialMessages, isEmbedded);

  // Add submission tracking to prevent double submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmissionRef = useRef<string>("");

  // Handle countdown finish - clear rate limit error
  const handleCountdownFinished = () => {
    setRateLimitError(null);
    setTimeUntilReset(null);
    
    // Focus input field when rate limit is cleared
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const proceedWithMessageWrapper = async (text: string) => {
    await proceedWithMessage(
      text,
      setChatHistory,
      setUserHasMessaged,
      setIsTyping,
      inputRef,
      isEmbedded,
      conversationId
    );
  };

  // Enhanced message submission with deduplication
  const submitMessage = async (text: string, agentId?: string) => {
    const trimmedText = text.trim();
    
    // Prevent duplicate submissions
    if (isSubmitting || !trimmedText || lastSubmissionRef.current === trimmedText) {
      console.log('Submission blocked - duplicate or empty');
      return;
    }

    setIsSubmitting(true);
    lastSubmissionRef.current = trimmedText;
    
    try {
      console.log('Submitting message:', trimmedText);
      
      // Clear input immediately
      setMessage("");
      
      // Check rate limit if agentId is provided
      if (agentId) {
        const rateLimitStatus = await checkRateLimit(agentId);
        
        if (rateLimitStatus.exceeded) {
          console.log('Rate limit exceeded');
          setRateLimitError(rateLimitStatus.message || 'Too many messages in a row');
          if (rateLimitStatus.timeUntilReset) {
            setTimeUntilReset(rateLimitStatus.timeUntilReset);
          }
          return;
        }
        
        // Record the message
        await recordMessage(agentId);
      }
      
      // Add message to chat and proceed
      await proceedWithMessageWrapper(trimmedText);
    } finally {
      // Reset submission state after a short delay
      setTimeout(() => {
        setIsSubmitting(false);
        lastSubmissionRef.current = "";
      }, 1000);
    }
  };

  const handleSubmit = async (e: React.FormEvent, agentId?: string) => {
    e.preventDefault();
    
    if (!message.trim() || isTyping || rateLimitError || isSubmitting) {
      return;
    }

    const messageToSend = message.trim();
    await submitMessage(messageToSend, agentId);
    
    if (isEmbedded) {
      e.stopPropagation();
    }
  };

  const handleSuggestedMessageClick = async (text: string, agentId?: string) => {
    if (isTyping || rateLimitError || isSubmitting) return;
    
    await submitMessage(text, agentId);
    
    // Focus input field after suggested message click
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleFeedbackWrapper = async (timestamp: string, type: "like" | "dislike") => {
    await handleFeedback(timestamp, type, setChatHistory);
  };

  const regenerateResponseWrapper = async (allowRegenerate: boolean) => {
    await regenerateResponse(
      allowRegenerate,
      chatHistory,
      isTyping,
      setChatHistory,
      setIsTyping,
      inputRef,
      conversationId
    );
  };

  const insertEmojiWrapper = (emoji: string) => {
    insertEmoji(emoji, isTyping, rateLimitError, setMessage, inputRef);
  };

  // Cleanup countdown on unmount
  const cleanup = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  return {
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    rateLimitError,
    setRateLimitError,
    timeUntilReset,
    setTimeUntilReset,
    isWaitingForRateLimit,
    setIsWaitingForRateLimit,
    userHasMessaged,
    inputRef,
    handleSubmit,
    handleSuggestedMessageClick,
    copyMessageToClipboard,
    handleFeedback: handleFeedbackWrapper,
    regenerateResponse: regenerateResponseWrapper,
    insertEmoji: insertEmojiWrapper,
    proceedWithMessage: proceedWithMessageWrapper,
    submitMessage,
    handleCountdownFinished,
    cleanup,
    isSubmitting // Export for UI state
  };
};
