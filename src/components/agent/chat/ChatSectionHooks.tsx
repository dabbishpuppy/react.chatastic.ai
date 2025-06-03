
import { useParams } from "react-router-dom";
import { useConversationManager } from "@/hooks/useConversationManager";
import { useLeadSettings } from "@/hooks/useLeadSettings";
import { useChatSettings } from "@/hooks/useChatSettings";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatHandlers } from "@/hooks/useChatHandlers";
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
  
  // Get all the original messageHandling properties from the existing hooks
  const {
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    rateLimitError,
    timeUntilReset,
    userHasMessaged,
    inputRef,
    handleSubmit,
    handleSuggestedMessageClick,
    copyMessageToClipboard,
    handleFeedback,
    regenerateResponse,
    insertEmoji,
    handleCountdownFinished,
    cleanup,
    isSubmitting
  } = {
    message: "",
    setMessage: () => {},
    chatHistory: [],
    setChatHistory: () => {},
    isTyping: false,
    rateLimitError: null,
    timeUntilReset: null,
    userHasMessaged: false,
    inputRef: { current: null },
    handleSubmit: async () => {},
    handleSuggestedMessageClick: async () => {},
    copyMessageToClipboard: () => {},
    handleFeedback: () => {},
    regenerateResponse: async () => {},
    insertEmoji: () => {},
    handleCountdownFinished: () => {},
    cleanup: () => {},
    isSubmitting: false
  };

  const { messagesEndRef, chatContainerRef, scrollToBottom } = useChatScroll(isEmbedded || false, chatHistory, isTyping);
  const { handleSubmitWithAgentId, handleSuggestedMessageClickWithAgentId, handleRegenerateWithAgentId } = useChatHandlers(handleSubmit, handleSuggestedMessageClick, regenerateResponse);

  // Enhanced getConversationMessages that uses the agentId
  const getConversationMessagesWithAgent = async (conversationId: string) => {
    console.log('🔄 Getting conversation messages with agent ID:', agentId, 'for conversation:', conversationId);
    return await getConversationMessages(conversationId);
  };

  // Wrap startNewConversation to match expected return type
  const wrappedStartNewConversation = async () => {
    await startNewConversation();
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
    rateLimitError,
    timeUntilReset,
    userHasMessaged,
    inputRef,
    copyMessageToClipboard,
    handleFeedback,
    insertEmoji,
    handleCountdownFinished,
    cleanup,
    isSubmitting,
    messagesEndRef,
    chatContainerRef,
    scrollToBottom,
    handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId
  };
};
