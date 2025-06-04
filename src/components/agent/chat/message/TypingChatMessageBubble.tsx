
import React from "react";
import TypingMessage from "../TypingMessage";

interface TypingChatMessageBubbleProps {
  content: string;
  isAgent: boolean;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle?: React.CSSProperties;
  isTyping?: boolean;
  onTypingComplete?: () => void;
}

const TypingChatMessageBubble: React.FC<TypingChatMessageBubbleProps> = ({
  content,
  isAgent,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle = {},
  isTyping = false,
  onTypingComplete
}) => {
  return (
    <div 
      className={`rounded-lg p-3 text-[0.875rem] ${
        isAgent ? agentBubbleClass : userBubbleClass
      }`}
      style={isAgent ? {} : userMessageStyle}
    >
      {isAgent && isTyping ? (
        <TypingMessage 
          content={content} 
          onComplete={onTypingComplete}
          typingSpeed={10}
        />
      ) : (
        content
      )}
    </div>
  );
};

export default TypingChatMessageBubble;
