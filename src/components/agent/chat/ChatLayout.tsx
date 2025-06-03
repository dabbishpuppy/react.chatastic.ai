
import React from "react";
import { ChatContainer } from "./ChatContainer";
import { ChatSectionProps } from "./ChatSectionProps";
import { ChatSectionState } from "./ChatSectionState";
import { ChatSectionHooks } from "./ChatSectionHooks";
import { ChatSectionHandlers } from "./ChatSectionHandlers";

interface ChatLayoutProps extends ChatSectionProps, ChatSectionState, ChatSectionHooks, ChatSectionHandlers {}

export const ChatLayout: React.FC<ChatLayoutProps> = (props) => {
  return (
    <ChatContainer
      messages={props.messages}
      inputValue={props.inputValue}
      isLoading={props.isLoading}
      hasUserSentMessage={props.hasUserSentMessage}
      agentName={props.agentName}
      placeholder={props.placeholder}
      suggestedMessages={props.suggestedMessages}
      showSuggestions={props.showSuggestions}
      showFeedback={props.showFeedback}
      allowRegenerate={props.allowRegenerate}
      theme={props.theme}
      profilePicture={props.profilePicture}
      footer={props.footer}
      userMessageColor={props.userMessageColor}
      headerColor={props.headerColor}
      hideUserAvatar={props.hideUserAvatar}
      onSendMessage={props.handleSendMessage}
      onInputChange={props.handleInputChange}
      onKeyPress={props.handleKeyPress}
      onSuggestedMessageClick={props.handleSuggestedMessageClick}
      onRegenerate={props.handleRegenerate}
      onFeedback={props.handleFeedback}
      messagesEndRef={props.messagesEndRef}
      inputRef={props.inputRef}
      toggleSettings={props.toggleSettings}
    />
  );
};
