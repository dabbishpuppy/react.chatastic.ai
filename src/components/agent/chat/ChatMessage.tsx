
import React from "react";
import { ChatMessage as ChatMessageType } from "@/types/chatInterface";
import SharedChatMessage from "./SharedChatMessage";

interface ChatMessageProps {
  message: ChatMessageType;
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  onRegenerate?: () => void;
  allowRegenerate?: boolean;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle: React.CSSProperties;
  isInitialMessage?: boolean;
  isLastAgentMessage?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = (props) => {
  return (
    <SharedChatMessage
      {...props}
      message={{
        id: props.message.id,
        content: props.message.content,
        isAgent: props.message.isAgent,
        timestamp: props.message.timestamp,
        feedback: props.message.feedback
      }}
    />
  );
};

export default ChatMessage;
