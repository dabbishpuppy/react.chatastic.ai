
import React from "react";
import ChatScrollArea from "./message/ChatScrollArea";
import { ChatMessage } from "@/types/chatInterface";

interface ChatMainContentProps {
  chatHistory: ChatMessage[];
  isTyping: boolean;
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  onRegenerate?: () => void;
  allowRegenerate?: boolean;
  themeClasses: any;
  userMessageStyle: any;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  leadSettings?: any;
  agentId?: string;
  conversationId?: string;
  theme?: 'light' | 'dark';
  onLeadFormSubmit?: () => void;
}

const ChatMainContent: React.FC<ChatMainContentProps> = (props) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatScrollArea {...props} />
    </div>
  );
};

export default ChatMainContent;
