
import React from "react";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatMessageActions from "./ChatMessageActions";

interface MessageContentProps {
  content: string;
  isAgent: boolean;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle?: React.CSSProperties;
  messageId?: string;
  feedback?: 'like' | 'dislike';
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

const MessageContent: React.FC<MessageContentProps> = ({
  content,
  isAgent,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle = {},
  messageId,
  feedback,
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
  // Hide actions for initial messages - they should not have Like/Dislike/Copy buttons
  const shouldShowFeedback = isAgent && showFeedback && !isInitialMessage;

  console.log('🎯 MessageContent - Should show feedback?', {
    isAgent,
    showFeedback,
    isInitialMessage,
    shouldShowFeedback,
    messageId
  });

  return (
    <div className="flex flex-col max-w-[80%]">
      <ChatMessageBubble
        content={content}
        isAgent={isAgent}
        agentBubbleClass={agentBubbleClass}
        userBubbleClass={userBubbleClass}
        userMessageStyle={userMessageStyle}
      />
      
      {shouldShowFeedback && (
        <ChatMessageActions
          messageId={messageId}
          messageContent={content}
          feedback={feedback}
          showFeedback={showFeedback}
          allowRegenerate={allowRegenerate}
          isLastAgentMessage={isLastAgentMessage}
          readOnly={readOnly}
          isUpdatingFeedback={isUpdatingFeedback}
          showCopiedTooltip={showCopiedTooltip}
          onFeedback={onFeedback}
          onCopy={onCopy}
          onRegenerate={onRegenerate}
          isInitialMessage={isInitialMessage}
        />
      )}
    </div>
  );
};

export default MessageContent;
