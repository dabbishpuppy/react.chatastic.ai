
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
  onFeedback: (type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  onRegenerate?: () => void;
  isUpdatingFeedback: boolean;
  showCopiedTooltip: boolean;
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
  onFeedback,
  onCopy,
  onRegenerate,
  isUpdatingFeedback,
  showCopiedTooltip
}) => {
  const isAgent = message.isAgent !== undefined ? message.isAgent : message.role === 'assistant';

  return (
    <>
      <ChatMessageAvatar
        profilePicture={profilePicture}
        agentName={agentName}
        isAgent={isAgent}
        hideUserAvatar={hideUserAvatar}
      />
      
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
        onFeedback={onFeedback}
        onCopy={onCopy}
        onRegenerate={onRegenerate}
        isUpdatingFeedback={isUpdatingFeedback}
        showCopiedTooltip={showCopiedTooltip}
      />
      
      {!isAgent && (
        <ChatMessageAvatar
          profilePicture={profilePicture}
          agentName={agentName}
          isAgent={false}
          hideUserAvatar={hideUserAvatar}
        />
      )}
    </>
  );
};

export default MessageLayout;
