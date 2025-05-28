
import React from "react";
import ChatInputField from "./input/ChatInputField";
import ConversationEndedInput from "./input/ConversationEndedInput";
import ChatFooterElements from "./input/ChatFooterElements";

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isWaitingForRateLimit: boolean;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement>;
  chatIcon?: string;
  isEmbedded: boolean;
  footer?: string;
  footerClassName: string;
  theme: 'light' | 'dark' | 'system';
  inputBackgroundClass: string;
  inputTextClass: string;
  iconButtonClass: string;
  textClass: string;
  onEmojiInsert: (emoji: string) => void;
  isConversationEnded?: boolean;
  onStartNewChat?: () => void;
  isSubmitting?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  message,
  setMessage,
  onSubmit,
  isWaitingForRateLimit,
  placeholder,
  inputRef,
  chatIcon,
  isEmbedded,
  footer,
  footerClassName,
  theme,
  inputBackgroundClass,
  inputTextClass,
  iconButtonClass,
  textClass,
  onEmojiInsert,
  isConversationEnded = false,
  onStartNewChat,
  isSubmitting = false
}) => {
  // Determine the actual placeholder text to show
  const getPlaceholderText = () => {
    if (isConversationEnded) {
      return "Your conversation has ended";
    }
    if (isSubmitting) {
      return "Sending...";
    }
    if (isWaitingForRateLimit) {
      return "Checking rate limit...";
    }
    return placeholder;
  };

  // If conversation is ended, show different UI
  if (isConversationEnded) {
    return (
      <ConversationEndedInput
        onStartNewChat={onStartNewChat}
        chatIcon={chatIcon}
        isEmbedded={isEmbedded}
        footer={footer}
        footerClassName={footerClassName}
        textClass={textClass}
        inputBackgroundClass={inputBackgroundClass}
        inputTextClass={inputTextClass}
      />
    );
  }

  const isInputDisabled = isWaitingForRateLimit || isSubmitting;

  return (
    <div className="border-t p-4">
      <ChatInputField
        message={message}
        setMessage={setMessage}
        onSubmit={onSubmit}
        placeholder={getPlaceholderText()}
        inputRef={inputRef}
        isDisabled={isInputDisabled}
        isSubmitting={isSubmitting}
        theme={theme}
        inputBackgroundClass={inputBackgroundClass}
        inputTextClass={inputTextClass}
        iconButtonClass={iconButtonClass}
        onEmojiInsert={onEmojiInsert}
      />
      
      <ChatFooterElements
        chatIcon={chatIcon}
        isEmbedded={isEmbedded}
        footer={footer}
        footerClassName={footerClassName}
        textClass={textClass}
      />
    </div>
  );
};

export default ChatInput;
