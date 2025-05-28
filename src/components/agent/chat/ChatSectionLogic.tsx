
import React from "react";
import { ChatMessage } from "@/types/chatInterface";
import ChatHeader from "./ChatHeader";
import ChatMainContent from "./ChatMainContent";
import ChatFooter from "./ChatFooter";
import ChatContainer from "./ChatContainer";
import { getThemeClasses, getContrastColor } from "./ThemeConfig";
import { ChatSectionProps } from "./ChatSectionTypes";
import { useChatSectionHooks } from "./ChatSectionHooks";
import { useChatSectionEffects } from "./ChatSectionEffects";
import { useChatSectionHandlers } from "./ChatSectionHandlers";

const ChatSectionLogic: React.FC<ChatSectionProps> = (props) => {
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

  // Apply theme based on settings
  const themeClasses = getThemeClasses(theme);

  // Should we show suggested messages?
  const shouldShowSuggestions = suggestedMessages.length > 0 && (!userHasMessaged || showSuggestions);

  // User message style with custom color
  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  // Check if input should be disabled - only for rate limit and typing, not conversation ended
  const isInputDisabled = isTyping || !!rateLimitError || isSubmitting;

  // Convert 'system' theme to 'light' or 'dark' for components that don't support 'system'
  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? 'light' : theme;

  return (
    <ChatContainer
      isEmbedded={props.isEmbedded || false}
      themeClasses={themeClasses}
      chatContainerRef={chatContainerRef}
    >
      {/* Chat Header */}
      <ChatHeader
        agentName={agentName}
        profilePicture={profilePicture}
        allowRegenerate={allowRegenerate}
        toggleSettings={toggleSettings}
        onRegenerate={() => handleRegenerateWithAgentId(allowRegenerate)}
        headerColor={headerColor}
        backgroundColor={themeClasses.background}
        iconButtonClass={themeClasses.iconButton}
        onStartNewChat={handleStartNewChat}
        onEndChat={handleEndChat}
        onLoadConversation={handleLoadConversation}
        agentId={agentId || ''}
        isConversationEnded={conversationEnded}
        isEmbedded={props.isEmbedded || false}
      />

      {/* Chat Messages - Scrollable area */}
      <ChatMainContent
        chatHistory={chatHistory}
        isTyping={isTyping}
        agentName={agentName}
        profilePicture={profilePicture}
        showFeedback={showFeedback}
        hideUserAvatar={hideUserAvatar}
        onFeedback={handleFeedback}
        onCopy={copyMessageToClipboard}
        themeClasses={themeClasses}
        userMessageStyle={userMessageStyle}
        messagesEndRef={messagesEndRef}
        leadSettings={effectiveLeadSettings}
        agentId={agentId || ''}
        conversationId={currentConversation?.id}
        theme={resolvedTheme}
        onLeadFormSubmit={() => {
          console.log('📋 Lead form submitted from chat integration');
          // Remove the lead form message from chat and add any new messages that were pending
          setChatHistory(prev => {
            const filteredHistory = prev.filter(msg => msg.content !== "LEAD_FORM_WIDGET");
            console.log('📋 Chat history after lead form removal:', filteredHistory);
            return filteredHistory;
          });
        }}
      />

      {/* Fixed footer section */}
      <ChatFooter
        rateLimitError={rateLimitError}
        timeUntilReset={timeUntilReset}
        onCountdownFinished={handleCountdownFinished}
        shouldShowSuggestions={shouldShowSuggestions}
        suggestedMessages={suggestedMessages}
        handleSuggestedMessageClick={handleSuggestedMessageClickWithAgentId}
        isInputDisabled={isInputDisabled}
        theme={theme}
        themeClasses={themeClasses}
        message={message}
        setMessage={setMessage}
        onSubmit={handleSubmitWithConversation}
        placeholder={placeholder}
        inputRef={inputRef}
        chatIcon={chatIcon}
        isEmbedded={props.isEmbedded || false}
        footer={footer}
        footerClassName={footerClassName}
        onEmojiInsert={insertEmoji}
        isConversationEnded={conversationEnded}
        onStartNewChat={handleStartNewChat}
        isSubmitting={isSubmitting}
      />
    </ChatContainer>
  );
};

export default ChatSectionLogic;
