
import React from "react";
import RateLimitError from "./RateLimitError";
import SuggestedMessages from "./SuggestedMessages";
import ChatInput from "./ChatInput";
import { ThemeClasses } from "./ThemeConfig";

interface ChatFooterProps {
  rateLimitError: string | null;
  timeUntilReset: number | null;
  onCountdownFinished: () => void;
  shouldShowSuggestions: boolean;
  suggestedMessages: string[];
  handleSuggestedMessageClick: (text: string) => void;
  isInputDisabled: boolean;
  theme: 'light' | 'dark' | 'system';
  themeClasses: ThemeClasses;
  message: string;
  setMessage: (message: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement>;
  chatIcon?: string;
  isEmbedded: boolean;
  footer?: string;
  footerClassName: string;
  onEmojiInsert: (emoji: string) => void;
}

const ChatFooter: React.FC<ChatFooterProps> = ({
  rateLimitError,
  timeUntilReset,
  onCountdownFinished,
  shouldShowSuggestions,
  suggestedMessages,
  handleSuggestedMessageClick,
  isInputDisabled,
  theme,
  themeClasses,
  message,
  setMessage,
  onSubmit,
  placeholder,
  inputRef,
  chatIcon,
  isEmbedded,
  footer,
  footerClassName,
  onEmojiInsert
}) => (
  <div className={`flex-shrink-0 ${themeClasses.background}`}>
    {/* Rate limit error message with live countdown */}
    {rateLimitError && (
      <RateLimitError 
        message={rateLimitError} 
        timeUntilReset={timeUntilReset} 
        onCountdownFinished={onCountdownFinished}
      />
    )}

    {/* Suggested Messages */}
    {shouldShowSuggestions && suggestedMessages.length > 0 && (
      <SuggestedMessages
        messages={suggestedMessages}
        onMessageClick={handleSuggestedMessageClick}
        isWaitingForRateLimit={isInputDisabled}
        theme={theme}
        backgroundColor={themeClasses.background}
      />
    )}

    {/* Chat Input */}
    <ChatInput
      message={message}
      setMessage={setMessage}
      onSubmit={onSubmit}
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
      onEmojiInsert={onEmojiInsert}
    />
  </div>
);

export default ChatFooter;
