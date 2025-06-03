import React from "react";
import ChatContainer from "./ChatContainer";
import { ChatSectionProps } from "./ChatSectionProps";
import { ChatSectionState } from "./ChatSectionState";

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
  return (
    <ChatContainer
      isEmbedded={props.isEmbedded || false}
      themeClasses={{ background: 'bg-white' }}
      chatContainerRef={state.chatContainerRef}
    >
      {/* Chat content will be rendered here by the existing chat components */}
      <div className="flex-1">
        {/* This will be filled by the existing chat components */}
      </div>
    </ChatContainer>
  );
};
