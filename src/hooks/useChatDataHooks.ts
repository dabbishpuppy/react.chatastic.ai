
import { ChatSectionProps } from "@/components/agent/chat/ChatSectionProps";
import { useChatSectionHooks } from "@/components/agent/chat/ChatSectionHooks";

export const useChatDataHooks = (props: ChatSectionProps) => {
  const hooks = useChatSectionHooks(props);
  
  return {
    agentId: hooks.agentId,
    displayMessages: hooks.displayMessages,
    setDisplayMessages: hooks.setDisplayMessages,
    hasShownLeadForm: hooks.hasShownLeadForm,
    setHasShownLeadForm: hooks.setHasShownLeadForm,
    effectiveLeadSettings: hooks.effectiveLeadSettings,
    refreshSettings: hooks.refreshSettings,
    currentConversation: hooks.currentConversation,
    conversationEnded: hooks.conversationEnded,
    startNewConversation: hooks.startNewConversation,
    endCurrentConversation: hooks.endCurrentConversation,
    loadConversation: hooks.loadConversation,
    getConversationMessages: hooks.getConversationMessages,
    message: hooks.message,
    setMessage: hooks.setMessage,
    chatHistory: hooks.chatHistory,
    setChatHistory: hooks.setChatHistory,
    isTyping: hooks.isTyping,
    rateLimitError: hooks.rateLimitError,
    timeUntilReset: hooks.timeUntilReset,
    userHasMessaged: hooks.userHasMessaged,
    inputRef: hooks.inputRef,
    copyMessageToClipboard: hooks.copyMessageToClipboard,
    handleFeedback: hooks.handleFeedback,
    insertEmoji: hooks.insertEmoji,
    handleCountdownFinished: hooks.handleCountdownFinished,
    cleanup: hooks.cleanup,
    isSubmitting: hooks.isSubmitting,
    messagesEndRef: hooks.messagesEndRef,
    chatContainerRef: hooks.chatContainerRef,
    scrollToBottom: hooks.scrollToBottom,
    handleSubmitWithAgentId: hooks.handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId: hooks.handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId: hooks.handleRegenerateWithAgentId
  };
};
