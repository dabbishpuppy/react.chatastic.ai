
import React from "react";
import { useChatMessageHandlers } from "./message/useChatMessageHandlers";
import MessageContainer from "./message/MessageContainer";
import MessageLayout from "./message/MessageLayout";

export interface SharedChatMessageProps {
  message: {
    id?: string;
    content: string;
    isAgent?: boolean;
    role?: 'user' | 'assistant';
    timestamp: string;
    feedback?: 'like' | 'dislike';
  };
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar?: boolean;
  readOnly?: boolean;
  onFeedback?: (timestamp: string, type: "like" | "dislike") => void;
  onCopy?: (content: string) => void;
  onRegenerate?: () => void;
  allowRegenerate?: boolean;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle?: React.CSSProperties;
  isInitialMessage?: boolean;
  isLastAgentMessage?: boolean;
  theme?: 'light' | 'dark';
}

const SharedChatMessage: React.FC<SharedChatMessageProps> = ({
  message,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar = false,
  readOnly = false,
  onFeedback,
  onCopy,
  onRegenerate,
  allowRegenerate = false,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle = {},
  isInitialMessage = false,
  isLastAgentMessage = false,
  theme = 'light'
}) => {
  const isAgent = message.isAgent !== undefined ? message.isAgent : message.role === 'assistant';
  
  const {
    showCopiedTooltip,
    isUpdatingFeedback,
    handleCopy,
    handleFeedback
  } = useChatMessageHandlers(
    message.id,
    message.timestamp,
    message.feedback,
    onFeedback,
    onCopy,
    readOnly
  );

  return (
    <MessageContainer isAgent={isAgent}>
      <MessageLayout
        message={message}
        agentName={agentName}
        profilePicture={profilePicture}
        hideUserAvatar={hideUserAvatar}
        agentBubbleClass={agentBubbleClass}
        userBubbleClass={userBubbleClass}
        userMessageStyle={userMessageStyle}
        showFeedback={showFeedback}
        allowRegenerate={allowRegenerate}
        isLastAgentMessage={isLastAgentMessage}
        readOnly={readOnly}
        onFeedback={handleFeedback}
        onCopy={handleCopy}
        onRegenerate={onRegenerate}
        isUpdatingFeedback={isUpdatingFeedback}
        showCopiedTooltip={showCopiedTooltip}
      />
    </MessageContainer>
  );
};

export default SharedChatMessage;
