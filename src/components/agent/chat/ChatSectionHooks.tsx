import { useParams } from "react-router-dom";
import { useMessageHandling } from "@/hooks/useMessageHandling";
import { useConversationManager } from "@/hooks/useConversationManager";
import { useLeadSettings } from "@/hooks/useLeadSettings";
import { useChatSettings } from "@/hooks/useChatSettings";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatHandlers } from "@/hooks/useChatHandlers";
import { ChatSectionProps } from "./ChatSectionProps";
import { ChatSectionState } from "./ChatSectionState";

export const useChatSectionHooks = (props: ChatSectionProps): ChatSectionState => {
  const { agentId: routeAgentId } = useParams();
  const { agentId: propAgentId, initialMessages, isEmbedded, conversationSource, leadSettings } = props;
  const agentId = propAgentId || routeAgentId;

  const { settings, refreshSettings } = useChatSettings(agentId);
  const { effectiveLeadSettings, hasShownLeadForm, setHasShownLeadForm } = useLeadSettings(leadSettings, settings);
  const { currentConversation, conversationEnded, startNewConversation, endCurrentConversation, loadConversation, saveMessage, getConversationMessages } = useConversationManager(conversationSource);
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
    setUserHasMessaged,
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
  } = useMessageHandling(initialMessages, isEmbedded, currentConversation?.id, agentId, conversationSource, async () => {
    const conversation = await startNewConversation();
    return conversation?.id || null;
  });
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
    startNewConversation,
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
