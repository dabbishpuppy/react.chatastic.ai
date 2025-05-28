
import { ChatSectionProps } from "@/components/agent/chat/ChatSectionProps";
import { useChatSectionHooks } from "@/components/agent/chat/ChatSectionHooks";
import { useChatSectionHandlers } from "@/components/agent/chat/ChatSectionHandlers";
import { useChatSectionEffects } from "@/components/agent/chat/ChatSectionEffects";
import { getChatSectionHelpers } from "@/components/agent/chat/ChatSectionHelpers";

export const useChatDataPreparation = (props: ChatSectionProps) => {
  const {
    agentName = "AI Customer Service",
    placeholder = "Write message here...",
    suggestedMessages = [],
    showSuggestions = true,
    showFeedback = true,
    allowRegenerate = true,
    theme = 'light',
    profilePicture,
    chatIcon,
    footer,
    footerClassName = "",
    userMessageColor = null,
    headerColor = null,
    hideUserAvatar = false,
    toggleSettings
  } = props;

  const hooks = useChatSectionHooks(props);
  
  const {
    agentId,
    displayMessages,
    setDisplayMessages,
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
  } = hooks;

  // Wrap startNewConversation to match expected return type
  const wrappedStartNewConversation = async () => {
    await startNewConversation();
  };

  const {
    handleSubmitWithConversation,
    handleStartNewChat,
    handleEndChat,
    handleLoadConversation
  } = useChatSectionHandlers(
    currentConversation,
    props.conversationSource || 'iframe',
    agentId,
    props.isEmbedded || false,
    message,
    isTyping,
    rateLimitError,
    isSubmitting,
    wrappedStartNewConversation,
    handleSubmitWithAgentId,
    setChatHistory,
    setHasShownLeadForm,
    endCurrentConversation,
    loadConversation,
    getConversationMessages,
    setDisplayMessages,
    props.initialMessages || []
  );

  // Apply all effects
  useChatSectionEffects(
    props.isEmbedded || false,
    agentId,
    props.leadSettings,
    refreshSettings,
    effectiveLeadSettings,
    hasShownLeadForm,
    userHasMessaged,
    chatHistory,
    isTyping,
    setChatHistory,
    setHasShownLeadForm,
    scrollToBottom,
    currentConversation,
    setDisplayMessages,
    props.initialMessages || [],
    cleanup
  );

  // Get computed values and styles
  const {
    themeClasses,
    shouldShowSuggestions,
    userMessageStyle,
    isInputDisabled,
    resolvedTheme
  } = getChatSectionHelpers(
    theme,
    suggestedMessages,
    userHasMessaged,
    showSuggestions,
    userMessageColor,
    isTyping,
    rateLimitError,
    isSubmitting
  );

  return {
    // Props
    agentName,
    placeholder,
    suggestedMessages,
    showFeedback,
    allowRegenerate,
    theme,
    profilePicture,
    chatIcon,
    footer,
    footerClassName,
    hideUserAvatar,
    toggleSettings,

    // Hook data
    agentId,
    chatHistory,
    isTyping,
    rateLimitError,
    timeUntilReset,
    message,
    setMessage,
    inputRef,
    copyMessageToClipboard,
    handleFeedback,
    insertEmoji,
    handleCountdownFinished,
    isSubmitting,
    messagesEndRef,
    chatContainerRef,
    effectiveLeadSettings,
    currentConversation,
    conversationEnded,

    // Handlers
    handleSubmitWithConversation,
    handleStartNewChat,
    handleEndChat,
    handleLoadConversation,
    handleRegenerateWithAgentId,
    handleSuggestedMessageClickWithAgentId,

    // Computed values
    themeClasses,
    shouldShowSuggestions,
    userMessageStyle,
    isInputDisabled,
    resolvedTheme
  };
};
