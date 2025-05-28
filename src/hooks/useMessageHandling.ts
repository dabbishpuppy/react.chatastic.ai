
import { ChatMessage } from "@/types/chatInterface";
import { useChatState } from "./useChatState";
import { useSubmissionState } from "./useSubmissionState";
import { useMessageSubmission } from "./useMessageSubmission";
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

  const {
    isSubmitting,
    isSubmissionBlocked,
    recordSubmission,
    resetSubmission
  } = useSubmissionState();

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

  const { submitMessage } = useMessageSubmission({
    proceedWithMessage: proceedWithMessageWrapper,
    setMessage,
    setRateLimitError,
    setTimeUntilReset,
    isSubmissionBlocked,
    recordSubmission,
    resetSubmission
  });

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
    await submitMessage(messageToSend, submitAgentId || agentId);
    
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
    
    await submitMessage(text, submitAgentId || agentId);
    
    // Focus input field after suggested message click
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  // Handle countdown finish - clear rate limit error
  const handleCountdownFinished = () => {
    setRateLimitError(null);
    setTimeUntilReset(null);
    
    // Focus input field when rate limit is cleared
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
