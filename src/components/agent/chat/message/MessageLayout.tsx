
import React from "react";
import ChatMessageAvatar from "./ChatMessageAvatar";
import MessageContent from "./MessageContent";

interface MessageLayoutProps {
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
  hideUserAvatar?: boolean;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle?: React.CSSProperties;
  showFeedback: boolean;
  allowRegenerate?: boolean;
  isLastAgentMessage?: boolean;
  readOnly?: boolean;
  onFeedback: (type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  onRegenerate?: () => void;
  isUpdatingFeedback: boolean;
  showCopiedTooltip: boolean;
  isInitialMessage?: boolean;
}

const MessageLayout: React.FC<MessageLayoutProps> = ({
  message,
  agentName,
  profilePicture,
  hideUserAvatar = false,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle = {},
  showFeedback,
  allowRegenerate = false,
  isLastAgentMessage = false,
  readOnly = false,
  onFeedback,
  onCopy,
  onRegenerate,
  isUpdatingFeedback,
  showCopiedTooltip,
  isInitialMessage = false
}) => {
  const isAgent = message.isAgent !== undefined ? message.isAgent : message.role === 'assistant';

  return (
    <>
      {isAgent && (
        <ChatMessageAvatar
          profilePicture={profilePicture}
          agentName={agentName}
          isAgent={true}
          hideUserAvatar={hideUserAvatar}
        />
      )}
      
      <MessageContent
        content={message.content}
        isAgent={isAgent}
        agentBubbleClass={agentBubbleClass}
        userBubbleClass={userBubbleClass}
        userMessageStyle={userMessageStyle}
        messageId={message.id}
        feedback={message.feedback}
        showFeedback={showFeedback}
        allowRegenerate={allowRegenerate}
        isLastAgentMessage={isLastAgentMessage}
        readOnly={readOnly}
        onFeedback={onFeedback}
        onCopy={onCopy}
        onRegenerate={onRegenerate}
        isUpdatingFeedback={isUpdatingFeedback}
        showCopiedTooltip={showCopiedTooltip}
        isInitialMessage={isInitialMessage}
      />
    </>
  );
};

export default MessageLayout;
