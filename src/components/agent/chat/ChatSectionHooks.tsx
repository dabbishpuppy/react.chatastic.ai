
import { useParams } from "react-router-dom";
import { useConversationManager } from "@/hooks/useConversationManager";
import { useLeadSettings } from "@/hooks/useLeadSettings";
import { useChatSettings } from "@/hooks/useChatSettings";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatHandlers } from "@/hooks/useChatHandlers";
import { useChatState } from "@/hooks/useChatState";
import { useMessageHandlers } from "@/hooks/useMessageHandlers";
import { useMessageSubmission } from "@/hooks/useMessageSubmission";
import { useMessageOperations } from "@/hooks/useMessageOperations";
import { useSubmissionState } from "@/hooks/useSubmissionState";
import { ChatSectionProps } from "./ChatSectionProps";
import { ChatSectionState } from "./ChatSectionState";
import { useState } from "react";

export const useChatSectionHooks = (props: ChatSectionProps): ChatSectionState => {
  const { agentId: routeAgentId } = useParams();
  const { agentId: propAgentId, initialMessages, isEmbedded, conversationSource, leadSettings } = props;
  const agentId = propAgentId || routeAgentId;

  const { settings, refreshSettings } = useChatSettings();
  
  // Use the leadSettings from props if provided, otherwise use the hook
  const leadSettingsHook = useLeadSettings(agentId || '');
  const effectiveLeadSettings = leadSettings || leadSettingsHook.settings;
  const [hasShownLeadForm, setHasShownLeadForm] = useState(false);

  const { currentConversation, conversationEnded, startNewConversation, endCurrentConversation, loadConversation, saveMessage, getConversationMessages } = useConversationManager(conversationSource);
  
  // Use actual chat state instead of dummy values
  const {
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    setIsTyping,
    isThinking,
    setIsThinking,
    typingMessageId,
    setTypingMessageId,
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

  // Set up submission state
  const submissionState = useSubmissionState();

  // Set up message operations
  const { proceedWithMessage } = useMessageOperations({
    setChatHistory,
    setUserHasMessaged,
    setIsTyping,
    inputRef,
    isEmbedded: isEmbedded || false,
    conversationId: currentConversation?.id,
    createConversationCallback: async () => {
      await startNewConversation();
      return currentConversation?.id || null;
    }
  });

  // Set up message submission
  const { submitMessage } = useMessageSubmission({
    proceedWithMessage,
    setMessage,
    setRateLimitError,
    setTimeUntilReset,
    isSubmissionBlocked: submissionState.isSubmissionBlocked,
    recordSubmission: submissionState.recordSubmission,
    resetSubmission: submissionState.resetSubmission
  });

  // Set up message handlers
  const {
    handleFeedback: handleFeedbackOriginal,
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
    conversationId: currentConversation?.id,
    setRateLimitError,
    setTimeUntilReset,
    rateLimitError
  });

  // Create wrapper for handleFeedback to match expected signature
  const handleFeedback = (messageId: string, isPositive: boolean) => {
    // Find the message by ID to get its timestamp
    const message = chatHistory.find(msg => msg.id === messageId);
    if (message) {
      const feedbackType = isPositive ? "like" : "dislike";
      handleFeedbackOriginal(message.timestamp, feedbackType);
    }
  };

  // Create submit handler
  const handleSubmit = async (e: React.FormEvent, agentIdParam?: string) => {
    e.preventDefault();
    await submitMessage(message.trim(), agentIdParam || agentId);
  };

  // Create suggested message click handler
  const handleSuggestedMessageClick = async (text: string, agentIdParam?: string) => {
    setMessage(text);
    await submitMessage(text, agentIdParam || agentId);
  };

  // Create regenerate handler that matches the useChatHandlers expected signature
  const regenerateResponseWrapper = async (allowRegenerate: boolean) => {
    await regenerateResponse(allowRegenerate);
  };

  // Cleanup function
  const cleanup = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  };

  const { messagesEndRef, chatContainerRef, scrollToBottom } = useChatScroll(isEmbedded || false, chatHistory, isTyping);
  const { handleSubmitWithAgentId, handleSuggestedMessageClickWithAgentId, handleRegenerateWithAgentId } = useChatHandlers(handleSubmit, handleSuggestedMessageClick, regenerateResponseWrapper);

  // Enhanced getConversationMessages that uses the agentId
  const getConversationMessagesWithAgent = async (conversationId: string) => {
    console.log('🔄 Getting conversation messages with agent ID:', agentId, 'for conversation:', conversationId);
    return await getConversationMessages(conversationId);
  };

  // Wrap startNewConversation to match expected return type
  const wrappedStartNewConversation = async () => {
    await startNewConversation();
  };

  // Create a proper handleRegenerate function that matches the expected signature for the state
  const handleRegenerate = async (messageIndex: number, agentIdParam?: string) => {
    // Call the regenerateResponse with allowRegenerate=true
    await regenerateResponse(true);
  };

  // Create typing complete handler
  const handleTypingComplete = (messageId: string) => {
    console.log('🎯 Typing complete for message:', messageId);
    setTypingMessageId(null);
  };

  return {
    agentId,
    displayMessages: chatHistory,
    setDisplayMessages: setChatHistory,
    hasShownLeadForm,
    setHasShownLeadForm,
    effectiveLeadSettings,
    refreshSettings: leadSettingsHook.refreshSettings,
    currentConversation,
    conversationEnded,
    startNewConversation: wrappedStartNewConversation,
    endCurrentConversation,
    loadConversation,
    getConversationMessages: getConversationMessagesWithAgent,
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    isThinking,
    setIsThinking,
    typingMessageId,
    setTypingMessageId,
    rateLimitError,
    timeUntilReset,
    userHasMessaged,
    inputRef,
    copyMessageToClipboard: () => {}, // Implement if needed
    handleFeedback,
    insertEmoji,
    handleCountdownFinished,
    cleanup,
    isSubmitting: submissionState.isSubmitting,
    messagesEndRef,
    chatContainerRef,
    scrollToBottom,
    handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId: handleRegenerate,
    handleTypingComplete
  };
};
