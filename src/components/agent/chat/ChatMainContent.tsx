
import React from "react";
import ChatMessages from "./ChatMessages";
import { ChatMessage } from "@/types/chatInterface";
import { ThemeClasses } from "./ThemeConfig";

interface ChatMainContentProps {
  chatHistory: ChatMessage[];
  isTyping: boolean;
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  themeClasses: ThemeClasses;
  userMessageStyle: React.CSSProperties;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatMainContent: React.FC<ChatMainContentProps> = ({
  chatHistory,
  isTyping,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar,
  onFeedback,
  onCopy,
  themeClasses,
  userMessageStyle,
  messagesEndRef
}) => (
  <div className={`flex-1 overflow-y-auto p-6 ${themeClasses.background} scroll-container`}>
    <ChatMessages
      chatHistory={chatHistory}
      isTyping={isTyping}
      agentName={agentName}
      profilePicture={profilePicture}
      showFeedback={showFeedback}
      hideUserAvatar={hideUserAvatar}
      onFeedback={onFeedback}
      onCopy={onCopy}
      agentBubbleClass={themeClasses.agentBubble}
      userBubbleClass={themeClasses.userBubble}
      userMessageStyle={userMessageStyle}
      messagesEndRef={messagesEndRef}
    />
  </div>
);

export default ChatMainContent;
