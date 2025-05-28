
import React from "react";

interface ChatMessageBubbleProps {
  content: string;
  isAgent: boolean;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle?: React.CSSProperties;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  content,
  isAgent,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle = {}
}) => {
  return (
    <div 
      className={`rounded-lg p-3 text-[0.875rem] ${
        isAgent ? agentBubbleClass : userBubbleClass
      }`}
      style={isAgent ? {} : userMessageStyle}
    >
      {content}
    </div>
  );
};

export default ChatMessageBubble;
