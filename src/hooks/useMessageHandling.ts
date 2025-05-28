
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
  conversationId?: string,
  agentId?: string,
  source: 'iframe' | 'bubble' = 'iframe',
  createConversationCallback?: () => Promise<string | null>
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
    // Ensure we have a conversation ID before proceeding
    let activeConversationId = conversationId;
    
    if (!activeConversationId && createConversationCallback) {
      console.log('🆕 No conversation ID, creating new conversation before processing message');
      activeConversationId = await createConversationCallback();
      
      if (!activeConversationId) {
        console.error('❌ Failed to create conversation, cannot process message');
        // Still add message to UI for user experience but show error
        const userMessage: ChatMessage = {
          content: text.trim(),
          isAgent: false,
          timestamp: new Date().toISOString(),
        };
        setChatHistory(prev => [...prev, userMessage]);
        setUserHasMessaged(true);
        setIsTyping(true);
        
        // Add error message
        setTimeout(() => {
          const errorMessage: ChatMessage = {
            content: "I'm sorry, there was an issue starting the conversation. Please try refreshing the page.",
            isAgent: true,
            timestamp: new Date().toISOString(),
          };
          setChatHistory(prev => [...prev, errorMessage]);
          setIsTyping(false);
        }, 1000);
        return;
      }
    }

    if (!activeConversationId) {
      console.error('❌ No conversation ID available and no callback to create one');
      return;
    }

    await proceedWithMessage(
      text,
      setChatHistory,
      setUserHasMessaged,
      setIsTyping,
      inputRef,
      isEmbedded,
      activeConversationId
    );
  };

  // Enhanced message submission with stronger deduplication
  const submitMessage = async (text: string, submitAgentId?: string) => {
    const trimmedText = text.trim();
    const now = Date.now();
    const effectiveAgentId = submitAgentId || agentId;
    
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
      agentId: effectiveAgentId,
      conversationId,
      source
    });

    setIsSubmitting(true);
    lastSubmissionRef.current = trimmedText;
    lastSubmissionTimeRef.current = now;
    
    try {
      // Clear input immediately
      setMessage("");
      
      // Check rate limit if agentId is provided
      if (effectiveAgentId) {
        const rateLimitStatus = await checkRateLimit(effectiveAgentId);
        
        if (rateLimitStatus.exceeded) {
          console.log('🚫 Rate limit exceeded');
          setRateLimitError(rateLimitStatus.message || 'Too many messages in a row');
          if (rateLimitStatus.timeUntilReset) {
            setTimeUntilReset(rateLimitStatus.timeUntilReset);
          }
          return;
        }
        
        // Record the message
        await recordMessage(effectiveAgentId);
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
