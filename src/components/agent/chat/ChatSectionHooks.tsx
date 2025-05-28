
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChatMessage } from "@/types/chatInterface";
import { useMessageHandling } from "@/hooks/useMessageHandling";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatHandlers } from "@/hooks/useChatHandlers";
import { useConversationManager } from "@/hooks/useConversationManager";
import { useLeadSettings } from "@/hooks/useLeadSettings";
import { ChatSectionProps } from "./ChatSectionTypes";

export const useChatSectionHooks = (props: ChatSectionProps) => {
  const {
    agentId: propAgentId,
    initialMessages = [],
    isEmbedded = false,
    conversationSource = 'iframe',
    leadSettings: propLeadSettings = null
  } = props;

  const { agentId: paramAgentId } = useParams();
  const agentId = propAgentId || paramAgentId;
  
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(initialMessages);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [hasShownLeadForm, setHasShownLeadForm] = useState(false);
  
  // Load lead settings - use prop leadSettings if available (for embedded mode), otherwise use hook
  const { settings: hookLeadSettings, refreshSettings } = useLeadSettings(agentId || '');
  const effectiveLeadSettings = propLeadSettings || hookLeadSettings;
  
  console.log('📋 ChatSection - Using lead settings:', {
    propLeadSettings,
    hookLeadSettings,
    effectiveLeadSettings,
    isEmbedded,
    conversationSource
  });

  // Conversation management with the correct source
  const {
    currentConversation,
    conversationEnded,
    agentId: conversationAgentId,
    startNewConversation,
    endCurrentConversation,
    loadConversation,
    saveMessage,
    getConversationMessages
  } = useConversationManager(conversationSource);

  // Create a callback for conversation creation that can be passed to useMessageHandling
  const createConversationCallback = async (): Promise<string | null> => {
    console.log('🆕 Creating conversation via callback for message handling');
    const conversation = await startNewConversation();
    return conversation?.id || null;
  };

  const {
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    rateLimitError,
    timeUntilReset,
    isWaitingForRateLimit,
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
  } = useMessageHandling(
    displayMessages, 
    isEmbedded, 
    currentConversation?.id, 
    agentId, 
    conversationSource,
    createConversationCallback
  );

  const { messagesEndRef, chatContainerRef, scrollToBottom } = useChatScroll(isEmbedded, chatHistory, isTyping);

  const {
    handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId
  } = useChatHandlers(handleSubmit, handleSuggestedMessageClick, regenerateResponse);

  return {
    agentId,
    displayMessages,
    setDisplayMessages,
    showLeadForm,
    setShowLeadForm,
    hasShownLeadForm,
    setHasShownLeadForm,
    effectiveLeadSettings,
    refreshSettings,
    currentConversation,
    conversationEnded,
    conversationAgentId,
    startNewConversation,
    endCurrentConversation,
    loadConversation,
    saveMessage,
    getConversationMessages,
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    rateLimitError,
    timeUntilReset,
    isWaitingForRateLimit,
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
    isSubmitting,
    messagesEndRef,
    chatContainerRef,
    scrollToBottom,
    handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId
  };
};
