
import React from "react";
import ChatHeader from "./ChatHeader";
import ChatMainContent from "./ChatMainContent";
import ChatFooter from "./ChatFooter";
import ChatContainer from "./ChatContainer";

interface ChatLayoutProps {
  // Header props
  agentName: string;
  profilePicture?: string;
  allowRegenerate: boolean;
  toggleSettings?: () => void;
  onRegenerate: () => void;
  headerColor: string | null;
  backgroundColor: string;
  iconButtonClass: string;
  onStartNewChat: () => void;
  onEndChat: () => void;
  onLoadConversation: (conversationId: string) => void;
  agentId: string;
  isConversationEnded: boolean;
  isEmbedded: boolean;

  // Main content props
  chatHistory: any[];
  isTyping: boolean;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  themeClasses: any;
  userMessageStyle: any;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  leadSettings?: any;
  conversationId?: string;
  theme: 'light' | 'dark';
  onLeadFormSubmit: () => void;

  // Footer props
  rateLimitError: string | null;
  timeUntilReset: number | null;
  onCountdownFinished: () => void;
  shouldShowSuggestions: boolean;
  suggestedMessages: string[];
  handleSuggestedMessageClick: (text: string) => Promise<void>;
  isInputDisabled: boolean;
  message: string;
  setMessage: (message: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement>;
  chatIcon?: string;
  footer?: string | null;
  footerClassName: string;
  onEmojiInsert: (emoji: string) => void;
  isSubmitting: boolean;

  // Container props
  chatContainerRef: React.RefObject<HTMLDivElement>;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  // Header props
  agentName,
  profilePicture,
  allowRegenerate,
  toggleSettings,
  onRegenerate,
  headerColor,
  backgroundColor,
  iconButtonClass,
  onStartNewChat,
  onEndChat,
  onLoadConversation,
  agentId,
  isConversationEnded,
  isEmbedded,

  // Main content props
  chatHistory,
  isTyping,
  showFeedback,
  hideUserAvatar,
  onFeedback,
  onCopy,
  themeClasses,
  userMessageStyle,
  messagesEndRef,
  leadSettings,
  conversationId,
  theme,
  onLeadFormSubmit,

  // Footer props
  rateLimitError,
  timeUntilReset,
  onCountdownFinished,
  shouldShowSuggestions,
  suggestedMessages,
  handleSuggestedMessageClick,
  isInputDisabled,
  message,
  setMessage,
  onSubmit,
  placeholder,
  inputRef,
  chatIcon,
  footer,
  footerClassName,
  onEmojiInsert,
  isSubmitting,

  // Container props
  chatContainerRef
}) => {
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
        onRegenerate={onRegenerate}
        headerColor={headerColor}
        backgroundColor={backgroundColor}
        iconButtonClass={iconButtonClass}
        onStartNewChat={onStartNewChat}
        onEndChat={onEndChat}
        onLoadConversation={onLoadConversation}
        agentId={agentId}
        isConversationEnded={isConversationEnded}
        isEmbedded={isEmbedded}
      />

      {/* Chat Messages - Scrollable area */}
      <ChatMainContent
        chatHistory={chatHistory}
        isTyping={isTyping}
        agentName={agentName}
        profilePicture={profilePicture}
        showFeedback={showFeedback}
        hideUserAvatar={hideUserAvatar}
        onFeedback={onFeedback}
        onCopy={onCopy}
        themeClasses={themeClasses}
        userMessageStyle={userMessageStyle}
        messagesEndRef={messagesEndRef}
        leadSettings={leadSettings}
        agentId={agentId}
        conversationId={conversationId}
        theme={theme}
        onLeadFormSubmit={onLeadFormSubmit}
      />

      {/* Fixed footer section */}
      <ChatFooter
        rateLimitError={rateLimitError}
        timeUntilReset={timeUntilReset}
        onCountdownFinished={onCountdownFinished}
        shouldShowSuggestions={shouldShowSuggestions}
        suggestedMessages={suggestedMessages}
        handleSuggestedMessageClick={handleSuggestedMessageClick}
        isInputDisabled={isInputDisabled}
        theme={theme}
        themeClasses={themeClasses}
        message={message}
        setMessage={setMessage}
        onSubmit={onSubmit}
        placeholder={placeholder}
        inputRef={inputRef}
        chatIcon={chatIcon}
        isEmbedded={isEmbedded}
        footer={footer}
        footerClassName={footerClassName}
        onEmojiInsert={onEmojiInsert}
        isConversationEnded={isConversationEnded}
        onStartNewChat={onStartNewChat}
        isSubmitting={isSubmitting}
      />
    </ChatContainer>
  );
};

export default ChatLayout;
