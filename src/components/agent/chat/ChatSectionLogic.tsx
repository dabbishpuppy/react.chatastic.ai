
import React from "react";
import ChatLayout from "./ChatLayout";
import { ChatSectionProps } from "./ChatSectionProps";
import { useChatDataPreparation } from "@/hooks/useChatDataPreparation";

const ChatSectionLogic: React.FC<ChatSectionProps> = (props) => {
  const {
    // Props
    agentName,
    placeholder,
    suggestedMessages,
    showFeedback,
    allowRegenerate,
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
  } = useChatDataPreparation(props);

  return (
    <ChatLayout
      // Header props
      agentName={agentName}
      profilePicture={profilePicture}
      allowRegenerate={allowRegenerate}
      toggleSettings={toggleSettings}
      onRegenerate={() => handleRegenerateWithAgentId(allowRegenerate)}
      headerColor={props.headerColor}
      backgroundColor={themeClasses.background}
      iconButtonClass={themeClasses.iconButton}
      onStartNewChat={handleStartNewChat}
      onEndChat={handleEndChat}
      onLoadConversation={handleLoadConversation}
      agentId={agentId || ''}
      isConversationEnded={conversationEnded}
      isEmbedded={props.isEmbedded || false}

      // Main content props
      chatHistory={chatHistory}
      isTyping={isTyping}
      showFeedback={showFeedback}
      hideUserAvatar={hideUserAvatar}
      onFeedback={handleFeedback}
      onCopy={copyMessageToClipboard}
      themeClasses={themeClasses}
      userMessageStyle={userMessageStyle}
      messagesEndRef={messagesEndRef}
      leadSettings={effectiveLeadSettings}
      conversationId={currentConversation?.id}
      theme={resolvedTheme}
      onLeadFormSubmit={() => {
        console.log('📋 Lead form submitted from chat integration');
        setMessage('');
      }}

      // Footer props
      rateLimitError={rateLimitError}
      timeUntilReset={timeUntilReset}
      onCountdownFinished={handleCountdownFinished}
      shouldShowSuggestions={shouldShowSuggestions}
      suggestedMessages={suggestedMessages}
      handleSuggestedMessageClick={handleSuggestedMessageClickWithAgentId}
      isInputDisabled={isInputDisabled}
      message={message}
      setMessage={setMessage}
      onSubmit={handleSubmitWithConversation}
      placeholder={placeholder}
      inputRef={inputRef}
      chatIcon={chatIcon}
      footer={footer}
      footerClassName={footerClassName}
      onEmojiInsert={insertEmoji}
      isSubmitting={isSubmitting}

      // Container props
      chatContainerRef={chatContainerRef}
    />
  );
};

export default ChatSectionLogic;
