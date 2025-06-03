
import React from "react";
import ChatContainer from "./ChatContainer";
import ChatMainContent from "./ChatMainContent";
import ChatInput from "./ChatInput";
import ChatHeader from "./ChatHeader";
import { ChatSectionProps } from "./ChatSectionProps";
import { ChatSectionState } from "./ChatSectionState";
import { getChatSectionHelpers } from "./ChatSectionHelpers";

interface ChatLayoutProps extends ChatSectionProps {
  state: ChatSectionState;
  handlers: {
    handleSendMessage: () => Promise<void>;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    handleSuggestedMessageClick: (message: string) => void;
    handleRegenerate: (messageIndex: number) => Promise<void>;
    handleFeedback: (messageId: string, isPositive: boolean) => void;
    isLoading: boolean;
  };
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ state, handlers, ...props }) => {
  // Get theme classes and computed values
  const {
    themeClasses,
    userMessageStyle,
    isInputDisabled
  } = getChatSectionHelpers(
    props.theme || 'light',
    props.suggestedMessages || [],
    state.userHasMessaged,
    props.showSuggestions || true,
    props.userMessageColor,
    state.isTyping,
    state.rateLimitError,
    state.isSubmitting
  );

  // Resolve 'system' theme to 'light' or 'dark' for components that don't support 'system'
  const resolvedTheme: 'light' | 'dark' = props.theme === 'system' ? 'light' : (props.theme || 'light');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handlers.handleSendMessage();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handlers.handleInputChange(e);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handlers.handleKeyPress(e);
  };

  const handleRegenerate = () => {
    const lastMessageIndex = state.chatHistory.length - 1;
    handlers.handleRegenerate(lastMessageIndex);
  };

  return (
    <ChatContainer
      isEmbedded={props.isEmbedded || false}
      themeClasses={{ background: themeClasses.background }}
      chatContainerRef={state.chatContainerRef}
    >
      <div className="flex flex-col h-full">
        {/* Chat header */}
        <ChatHeader
          agentName={props.agentName || "AI Assistant"}
          profilePicture={props.profilePicture}
          allowRegenerate={props.allowRegenerate || false}
          onRegenerate={handleRegenerate}
          headerColor={props.headerColor || null}
          backgroundColor={themeClasses.background}
          iconButtonClass={themeClasses.iconButton}
          onStartNewChat={state.startNewConversation}
          onEndChat={state.endCurrentConversation}
          onLoadConversation={state.loadConversation}
          agentId={state.agentId || ''}
          isConversationEnded={state.conversationEnded}
          isEmbedded={props.isEmbedded || false}
        />

        {/* Main chat content area */}
        <ChatMainContent
          chatHistory={state.chatHistory}
          isTyping={state.isTyping}
          isThinking={state.isThinking}
          typingMessageId={state.typingMessageId}
          agentName={props.agentName || "AI Assistant"}
          profilePicture={props.profilePicture}
          showFeedback={props.showFeedback || true}
          hideUserAvatar={props.hideUserAvatar || false}
          onFeedback={(timestamp: string, type: "like" | "dislike") => {
            handlers.handleFeedback(timestamp, type === "like");
          }}
          onCopy={(content: string) => {
            navigator.clipboard.writeText(content);
          }}
          onRegenerate={handleRegenerate}
          allowRegenerate={props.allowRegenerate || false}
          themeClasses={themeClasses}
          userMessageStyle={userMessageStyle}
          messagesEndRef={state.messagesEndRef}
          leadSettings={state.effectiveLeadSettings}
          agentId={state.agentId}
          conversationId={state.currentConversation?.id}
          theme={resolvedTheme}
          onTypingComplete={state.handleTypingComplete}
        />

        {/* Chat input area */}
        <ChatInput
          message={state.message}
          setMessage={state.setMessage}
          onSubmit={handleSubmit}
          isWaitingForRateLimit={isInputDisabled}
          placeholder={props.placeholder || "Type your message..."}
          inputRef={state.inputRef}
          chatIcon={props.chatIcon}
          isEmbedded={props.isEmbedded || false}
          footer={props.footer || undefined}
          footerClassName={props.footerClassName || ""}
          theme={props.theme || 'light'}
          inputBackgroundClass={themeClasses.inputBg}
          inputTextClass={themeClasses.inputText}
          iconButtonClass={themeClasses.iconButton}
          textClass={themeClasses.text}
          onEmojiInsert={(emoji: string) => {
            state.insertEmoji(emoji);
          }}
          isConversationEnded={state.conversationEnded}
          onStartNewChat={state.startNewConversation}
          isSubmitting={state.isSubmitting}
        />
      </div>
    </ChatContainer>
  );
};
