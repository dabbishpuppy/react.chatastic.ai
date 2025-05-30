
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessageList from "./ChatMessageList";
import TypingIndicator from "./TypingIndicator";
import { ChatMessage } from "@/types/chatInterface";

interface ChatScrollAreaProps {
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

const ChatScrollArea: React.FC<ChatScrollAreaProps> = ({
  chatHistory,
  isTyping,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar,
  onFeedback,
  onCopy,
  onRegenerate,
  allowRegenerate = false,
  themeClasses,
  userMessageStyle,
  messagesEndRef,
  leadSettings,
  agentId,
  conversationId,
  theme = 'light',
  onLeadFormSubmit
}) => {
  return (
    <ScrollArea className="flex-1 overflow-auto">
      <div className="px-4 py-2 min-h-full">
        <ChatMessageList
          chatHistory={chatHistory}
          agentName={agentName}
          profilePicture={profilePicture}
          showFeedback={showFeedback}
          hideUserAvatar={hideUserAvatar}
          onFeedback={onFeedback}
          onCopy={onCopy}
          onRegenerate={onRegenerate}
          allowRegenerate={allowRegenerate}
          themeClasses={themeClasses}
          userMessageStyle={userMessageStyle}
          messagesEndRef={messagesEndRef}
          leadSettings={leadSettings}
          agentId={agentId}
          conversationId={conversationId}
          theme={theme}
          onLeadFormSubmit={onLeadFormSubmit}
        />
        
        <TypingIndicator
          isTyping={isTyping}
          agentName={agentName}
          profilePicture={profilePicture}
          agentBubbleClass={themeClasses.agentMessage}
          messagesEndRef={messagesEndRef}
        />
      </div>
    </ScrollArea>
  );
};

export default ChatScrollArea;
