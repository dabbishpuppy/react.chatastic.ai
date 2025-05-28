
import { ChatMessage } from "@/types/chatInterface";
import { useChatState } from "./useChatState";
import { useSubmissionState } from "./useSubmissionState";
import { useMessageSubmission } from "./useMessageSubmission";
import { useMessageOperations } from "./useMessageOperations";
import { useMessageHandlers } from "./useMessageHandlers";
import { useFormSubmissionHandlers } from "./useFormSubmissionHandlers";
import { copyMessageToClipboard } from "@/utils/messageUtils";

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

  const { proceedWithMessage } = useMessageOperations({
    setChatHistory,
    setUserHasMessaged,
    setIsTyping,
    inputRef,
    isEmbedded,
    conversationId,
    createConversationCallback
  });

  const { submitMessage } = useMessageSubmission({
    proceedWithMessage,
    setMessage,
    setRateLimitError,
    setTimeUntilReset,
    isSubmissionBlocked,
    recordSubmission,
    resetSubmission
  });

  const {
    handleFeedback,
    regenerateResponse,
    insertEmoji,
    handleCountdownFinished
  } = useMessageHandlers({
    chatHistory,
    isTyping,
    setChatHistory,
    setIsTyping,
    setMessage,
    inputRef,
    conversationId,
    setRateLimitError,
    setTimeUntilReset,
    rateLimitError // Add the missing property
  });

  const {
    handleSubmit,
    handleSuggestedMessageClick
  } = useFormSubmissionHandlers({
    message,
    isTyping,
    rateLimitError,
    isSubmitting,
    submitMessage,
    inputRef,
    isEmbedded
  });

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
    handleFeedback,
    regenerateResponse,
    insertEmoji,
    proceedWithMessage,
    submitMessage,
    handleCountdownFinished,
    cleanup,
    isSubmitting
  };
};
