
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

  // Enhanced submission tracking with longer deduplication window
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmissionRef = useRef<string>("");
  const lastSubmissionTimeRef = useRef<number>(0);

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

  // Enhanced message submission with stronger deduplication
  const submitMessage = async (text: string, agentId?: string) => {
    const trimmedText = text.trim();
    const now = Date.now();
    
    // Enhanced duplicate prevention with 2-second window
    if (isSubmitting || 
        !trimmedText || 
        lastSubmissionRef.current === trimmedText ||
        (now - lastSubmissionTimeRef.current < 2000)) {
      console.log('🚫 Submission blocked:', {
        isSubmitting,
        emptyText: !trimmedText,
        duplicateText: lastSubmissionRef.current === trimmedText,
        tooSoon: now - lastSubmissionTimeRef.current < 2000,
        timeSinceLastSubmission: now - lastSubmissionTimeRef.current
      });
      return;
    }

    console.log('📤 Starting message submission:', {
      text: trimmedText.substring(0, 50) + '...',
      agentId,
      conversationId
    });

    setIsSubmitting(true);
    lastSubmissionRef.current = trimmedText;
    lastSubmissionTimeRef.current = now;
    
    try {
      // Clear input immediately
      setMessage("");
      
      // Check rate limit if agentId is provided
      if (agentId) {
        const rateLimitStatus = await checkRateLimit(agentId);
        
        if (rateLimitStatus.exceeded) {
          console.log('🚫 Rate limit exceeded');
          setRateLimitError(rateLimitStatus.message || 'Too many messages in a row');
          if (rateLimitStatus.timeUntilReset) {
            setTimeUntilReset(rateLimitStatus.timeUntilReset);
          }
          return;
        }
        
        // Record the message
        await recordMessage(agentId);
      }
      
      // Add message to chat and proceed (this will handle the database save)
      await proceedWithMessageWrapper(trimmedText);
      
      console.log('✅ Message submission completed successfully');
    } catch (error) {
      console.error('❌ Error during message submission:', error);
    } finally {
      // Extended reset delay to prevent rapid resubmission
      setTimeout(() => {
        setIsSubmitting(false);
        // Clear the last submission after 2 seconds to allow legitimate resubmissions
        setTimeout(() => {
          lastSubmissionRef.current = "";
          lastSubmissionTimeRef.current = 0;
        }, 2000);
      }, 1000);
    }
  };

  const handleSubmit = async (e: React.FormEvent, agentId?: string) => {
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
    await submitMessage(messageToSend, agentId);
    
    if (isEmbedded) {
      e.stopPropagation();
    }
  };

  const handleSuggestedMessageClick = async (text: string, agentId?: string) => {
    if (isTyping || rateLimitError || isSubmitting) {
      console.log('🚫 Suggested message click blocked:', {
        isTyping,
        rateLimitError: !!rateLimitError,
        isSubmitting
      });
      return;
    }
    
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
    isSubmitting
  };
};
