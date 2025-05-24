
import React, { useEffect } from "react";
import { ChatMessage } from "@/types/chatInterface";
import ChatHeader from "./chat/ChatHeader";
import ChatMainContent from "./chat/ChatMainContent";
import ChatFooter from "./chat/ChatFooter";
import ChatContainer from "./chat/ChatContainer";
import { useMessageHandling } from "@/hooks/useMessageHandling";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatHandlers } from "@/hooks/useChatHandlers";
import { getThemeClasses, getContrastColor } from "./chat/ThemeConfig";

interface ChatSectionProps {
  initialMessages?: ChatMessage[];
  toggleSettings?: () => void;
  agentName?: string;
  placeholder?: string;
  suggestedMessages?: string[];
  showSuggestions?: boolean;
  showFeedback?: boolean;
  allowRegenerate?: boolean;
  theme?: 'light' | 'dark' | 'system';
  profilePicture?: string;
  chatIcon?: string;
  footer?: string | null;
  footerClassName?: string;
  isEmbedded?: boolean;
  userMessageColor?: string | null;
  headerColor?: string | null;
  hideUserAvatar?: boolean;
}

const ChatSection: React.FC<ChatSectionProps> = ({ 
  initialMessages = [], 
  toggleSettings,
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
  isEmbedded = false,
  userMessageColor = null,
  headerColor = null,
  hideUserAvatar = false,
}) => {
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
    cleanup
  } = useMessageHandling(initialMessages, isEmbedded);

  const { messagesEndRef, chatContainerRef } = useChatScroll(isEmbedded, chatHistory, isTyping);

  const {
    handleSubmitWithAgentId,
    handleSuggestedMessageClickWithAgentId,
    handleRegenerateWithAgentId
  } = useChatHandlers(handleSubmit, handleSuggestedMessageClick, regenerateResponse);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Update chat when initialMessages prop changes
  useEffect(() => {
    if (initialMessages.length > 0) {
      setChatHistory(initialMessages);
    }
  }, [initialMessages, setChatHistory]);

  // Apply theme based on settings
  const themeClasses = getThemeClasses(theme);

  // Should we show suggested messages?
  const shouldShowSuggestions = suggestedMessages.length > 0 && (!userHasMessaged || showSuggestions);

  // User message style with custom color
  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  // Check if input should be disabled
  const isInputDisabled = isTyping || !!rateLimitError || isWaitingForRateLimit;

  return (
    <ChatContainer
      isEmbedded={isEmbedded}
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
      />

      {/* Fixed footer section with rate limit error, suggestions, and input */}
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
        onSubmit={handleSubmitWithAgentId}
        placeholder={placeholder}
        inputRef={inputRef}
        chatIcon={chatIcon}
        isEmbedded={isEmbedded}
        footer={footer}
        footerClassName={footerClassName}
        onEmojiInsert={insertEmoji}
      />
    </ChatContainer>
  );
};

export default ChatSection;
