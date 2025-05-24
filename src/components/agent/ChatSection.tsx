
import React, { useEffect } from "react";
import { ChatMessage } from "@/types/chatInterface";
import ChatHeader from "./chat/ChatHeader";
import ChatInput from "./chat/ChatInput";
import RateLimitError from "./chat/RateLimitError";
import SuggestedMessages from "./chat/SuggestedMessages";
import ChatMessages from "./chat/ChatMessages";
import ChatContainer from "./chat/ChatContainer";
import { useMessageHandling } from "@/hooks/useMessageHandling";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useParams } from "react-router-dom";

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

// Helper function to determine contrasting text color for a background
function getContrastColor(hex: string): string {
  let r = 0, g = 0, b = 0;
  
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
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
  const { agentId } = useParams();
  
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
    handleCountdownFinished,
    cleanup
  } = useMessageHandling(initialMessages, isEmbedded);

  const { messagesEndRef, chatContainerRef } = useChatScroll(isEmbedded, chatHistory, isTyping);

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
  const themeClasses = {
    agentBubble: theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-gray-100',
    userBubble: theme === 'dark' ? 'bg-blue-900 text-white' : 'bg-primary text-primary-foreground',
    background: theme === 'dark' ? 'bg-gray-900' : 'bg-white',
    text: theme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    inputBg: theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    inputText: theme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    iconButton: theme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-800',
    footerBg: theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-t text-gray-500',
  };

  // Should we show suggested messages?
  const shouldShowSuggestions = suggestedMessages.length > 0 && (!userHasMessaged || showSuggestions);

  // User message style with custom color
  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  // Enhanced handlers with agentId
  const handleSubmitWithAgentId = (e: React.FormEvent) => {
    handleSubmit(e, agentId);
  };

  const handleSuggestedMessageClickWithAgentId = (text: string) => {
    handleSuggestedMessageClick(text, agentId);
  };

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
        onRegenerate={() => regenerateResponse(allowRegenerate)}
        headerColor={headerColor}
        backgroundColor={themeClasses.background}
        iconButtonClass={themeClasses.iconButton}
      />

      {/* Chat Messages - Scrollable area */}
      <div className={`flex-1 overflow-y-auto p-6 ${themeClasses.background} scroll-container`}>
        <ChatMessages
          chatHistory={chatHistory}
          isTyping={isTyping}
          agentName={agentName}
          profilePicture={profilePicture}
          showFeedback={showFeedback}
          hideUserAvatar={hideUserAvatar}
          onFeedback={handleFeedback}
          onCopy={copyMessageToClipboard}
          agentBubbleClass={themeClasses.agentBubble}
          userBubbleClass={themeClasses.userBubble}
          userMessageStyle={userMessageStyle}
          messagesEndRef={messagesEndRef}
        />
      </div>

      {/* Fixed footer section with rate limit error, suggestions, and input */}
      <div className={`flex-shrink-0 ${themeClasses.background}`}>
        {/* Rate limit error message with live countdown */}
        {rateLimitError && (
          <RateLimitError 
            message={rateLimitError} 
            timeUntilReset={timeUntilReset} 
            onCountdownFinished={handleCountdownFinished}
          />
        )}

        {/* Suggested Messages */}
        {shouldShowSuggestions && suggestedMessages.length > 0 && (
          <SuggestedMessages
            messages={suggestedMessages}
            onMessageClick={handleSuggestedMessageClickWithAgentId}
            isWaitingForRateLimit={isInputDisabled}
            theme={theme}
            backgroundColor={themeClasses.background}
          />
        )}

        {/* Chat Input */}
        <ChatInput
          message={message}
          setMessage={setMessage}
          onSubmit={handleSubmitWithAgentId}
          isWaitingForRateLimit={isInputDisabled}
          placeholder={placeholder}
          inputRef={inputRef}
          chatIcon={chatIcon}
          isEmbedded={isEmbedded}
          footer={footer}
          footerClassName={footerClassName}
          theme={theme}
          inputBackgroundClass={themeClasses.inputBg}
          inputTextClass={themeClasses.inputText}
          iconButtonClass={themeClasses.iconButton}
          textClass={themeClasses.text}
          onEmojiInsert={insertEmoji}
        />
      </div>
    </ChatContainer>
  );
};

export default ChatSection;
