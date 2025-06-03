
import { ChatSectionProps } from "./ChatSectionProps";
import { ChatSectionState } from "./ChatSectionState";
import { useChatConversationOperations } from "@/hooks/useChatConversationOperations";
import { useChatStateAndSettings } from "@/hooks/useChatStateAndSettings";
import { useChatMessageOperationsSetup } from "@/hooks/useChatMessageOperationsSetup";
import { useChatHandlerCreation } from "@/hooks/useChatHandlerCreation";

export const useChatSectionHooks = (props: ChatSectionProps): ChatSectionState => {
  const { agentId: propAgentId, initialMessages, isEmbedded, conversationSource, leadSettings } = props;

  // Set up conversation operations
  const conversationOps = useChatConversationOperations(propAgentId, conversationSource);

  // Set up state and settings
  const stateAndSettings = useChatStateAndSettings({
    agentId: conversationOps.agentId,
    initialMessages,
    isEmbedded,
    leadSettings
  });

  // Set up message operations
  const messageOps = useChatMessageOperationsSetup({
    setChatHistory: stateAndSettings.setChatHistory,
    setUserHasMessaged: stateAndSettings.setUserHasMessaged,
    setIsTyping: stateAndSettings.setIsTyping,
    inputRef: stateAndSettings.inputRef,
    isEmbedded: isEmbedded || false,
    conversationId: conversationOps.currentConversation?.id,
    startNewConversation: conversationOps.startNewConversation,
    currentConversation: conversationOps.currentConversation,
    setIsThinking: stateAndSettings.setIsThinking,
    setTypingMessageId: stateAndSettings.setTypingMessageId,
    setMessage: stateAndSettings.setMessage,
    setRateLimitError: stateAndSettings.setRateLimitError,
    setTimeUntilReset: stateAndSettings.setTimeUntilReset
  });

  // Set up handlers
  const handlers = useChatHandlerCreation({
    chatHistory: stateAndSettings.chatHistory,
    isTyping: stateAndSettings.isTyping,
    setChatHistory: stateAndSettings.setChatHistory,
    setIsTyping: stateAndSettings.setIsTyping,
    setMessage: stateAndSettings.setMessage,
    inputRef: stateAndSettings.inputRef,
    conversationId: conversationOps.currentConversation?.id,
    setRateLimitError: stateAndSettings.setRateLimitError,
    setTimeUntilReset: stateAndSettings.setTimeUntilReset,
    rateLimitError: stateAndSettings.rateLimitError,
    agentId: conversationOps.agentId,
    message: stateAndSettings.message,
    submitMessage: messageOps.submitMessage
  });

  // Create typing complete handler
  const handleTypingComplete = (messageId: string) => {
    console.log('🎯 Typing complete for message:', messageId);
    stateAndSettings.setTypingMessageId(null);
  };

  return {
    agentId: conversationOps.agentId,
    displayMessages: stateAndSettings.chatHistory,
    setDisplayMessages: stateAndSettings.setChatHistory,
    hasShownLeadForm: stateAndSettings.hasShownLeadForm,
    setHasShownLeadForm: stateAndSettings.setHasShownLeadForm,
    effectiveLeadSettings: stateAndSettings.effectiveLeadSettings,
    refreshSettings: stateAndSettings.refreshSettings,
    currentConversation: conversationOps.currentConversation,
    conversationEnded: conversationOps.conversationEnded,
    startNewConversation: conversationOps.startNewConversation,
    endCurrentConversation: conversationOps.endCurrentConversation,
    loadConversation: conversationOps.loadConversation,
    getConversationMessages: conversationOps.getConversationMessages,
    message: stateAndSettings.message,
    setMessage: stateAndSettings.setMessage,
    chatHistory: stateAndSettings.chatHistory,
    setChatHistory: stateAndSettings.setChatHistory,
    isTyping: stateAndSettings.isTyping,
    isThinking: stateAndSettings.isThinking,
    setIsThinking: stateAndSettings.setIsThinking,
    typingMessageId: stateAndSettings.typingMessageId,
    setTypingMessageId: stateAndSettings.setTypingMessageId,
    rateLimitError: stateAndSettings.rateLimitError,
    timeUntilReset: stateAndSettings.timeUntilReset,
    userHasMessaged: stateAndSettings.userHasMessaged,
    inputRef: stateAndSettings.inputRef,
    copyMessageToClipboard: () => {}, // Implement if needed
    handleFeedback: handlers.handleFeedback,
    insertEmoji: handlers.insertEmoji,
    handleCountdownFinished: handlers.handleCountdownFinished,
    cleanup: stateAndSettings.cleanup,
    isSubmitting: messageOps.isSubmitting,
    messagesEndRef: stateAndSettings.messagesEndRef,
    chatContainerRef: stateAndSettings.chatContainerRef,
    scrollToBottom: stateAndSettings.scrollToBottom,
    handleSubmitWithAgentId: handlers.handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId: handlers.handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId: handlers.handleRegenerateWithAgentId,
    handleTypingComplete
  };
};
