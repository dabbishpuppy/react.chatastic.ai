
import { useParams } from "react-router-dom";
import { useMessageHandling } from "@/hooks/useMessageHandling";
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

  const { settings, refreshSettings } = useChatSettings(agentId);
  
  // Use the leadSettings from props if provided, otherwise use the hook
  const leadSettingsHook = useLeadSettings(agentId || '');
  const effectiveLeadSettings = leadSettings || leadSettingsHook.settings;
  const [hasShownLeadForm, setHasShownLeadForm] = useState(false);

  const { currentConversation, conversationEnded, startNewConversation, endCurrentConversation, loadConversation, saveMessage, getConversationMessages } = useConversationManager(conversationSource);
  
  const messageHandling = useMessageHandling(initialMessages, isEmbedded, currentConversation?.id, agentId, conversationSource, async () => {
    const conversation = await startNewConversation();
    return conversation?.id || null;
  });
  
  const {
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
  } = messageHandling;

  const { messagesEndRef, chatContainerRef, scrollToBottom } = useChatScroll(isEmbedded || false, chatHistory, isTyping);
  const { handleSubmitWithAgentId, handleSuggestedMessageClickWithAgentId, handleRegenerateWithAgentId } = useChatHandlers(handleSubmit, handleSuggestedMessageClick, regenerateResponse);

  // Function to add a message to the chat history and save it
  const addMessageToChatHistory = async (content: string, isAgent: boolean) => {
    const timestamp = new Date().toISOString();
    const newMessage = { content, isAgent, timestamp };

    // Save the message to the database
    await saveMessage(content, isAgent);

    // Update the local chat history
    setChatHistory(prevHistory => [...prevHistory, newMessage]);
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
    refreshSettings,
    currentConversation,
    conversationEnded,
    startNewConversation: wrappedStartNewConversation,
    endCurrentConversation,
    loadConversation,
    getConversationMessages,
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
