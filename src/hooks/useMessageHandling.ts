
import { useEffect } from "react";
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

  // Enhanced message submission with rate limiting
  const submitMessage = async (text: string, agentId?: string) => {
    console.log('Submitting message:', text);
    
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
    await proceedWithMessageWrapper(text);
  };

  const handleSubmit = async (e: React.FormEvent, agentId?: string) => {
    e.preventDefault();
    if (!message.trim() || isTyping || rateLimitError) return;

    const messageToSend = message.trim();
    await submitMessage(messageToSend, agentId);
    
    if (isEmbedded) {
      e.stopPropagation();
    }
  };

  const handleSuggestedMessageClick = async (text: string, agentId?: string) => {
    if (isTyping || rateLimitError) return;
    
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
    cleanup
  };
};
