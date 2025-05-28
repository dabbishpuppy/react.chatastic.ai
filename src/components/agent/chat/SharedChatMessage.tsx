
import React from "react";
import ChatMessageAvatar from "./message/ChatMessageAvatar";
import ChatMessageBubble from "./message/ChatMessageBubble";
import ChatMessageActions from "./message/ChatMessageActions";
import { useChatMessageHandlers } from "./message/useChatMessageHandlers";

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
    onCopy
  );

  const shouldShowFeedback = isAgent && showFeedback;

  return (
    <div className={`flex mb-4 ${isAgent ? '' : 'justify-end'}`}>
      <ChatMessageAvatar
        profilePicture={profilePicture}
        agentName={agentName}
        isAgent={isAgent}
        hideUserAvatar={hideUserAvatar}
      />
      
      <div className="flex flex-col max-w-[80%]">
        <ChatMessageBubble
          content={message.content}
          isAgent={isAgent}
          agentBubbleClass={agentBubbleClass}
          userBubbleClass={userBubbleClass}
          userMessageStyle={userMessageStyle}
        />
        
        {shouldShowFeedback && (
          <ChatMessageActions
            messageId={message.id}
            messageContent={message.content}
            feedback={message.feedback}
            showFeedback={showFeedback}
            allowRegenerate={allowRegenerate}
            isLastAgentMessage={isLastAgentMessage}
            isUpdatingFeedback={isUpdatingFeedback}
            showCopiedTooltip={showCopiedTooltip}
            onFeedback={handleFeedback}
            onCopy={handleCopy}
            onRegenerate={onRegenerate}
          />
        )}
      </div>
      
      {!isAgent && (
        <ChatMessageAvatar
          profilePicture={profilePicture}
          agentName={agentName}
          isAgent={false}
          hideUserAvatar={hideUserAvatar}
        />
      )}
    </div>
  );
};

export default SharedChatMessage;
