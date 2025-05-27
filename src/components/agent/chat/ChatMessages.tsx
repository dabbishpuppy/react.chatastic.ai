
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types/chatInterface";
import ChatMessageComponent from "./ChatMessage";
import LoadingDots from "./LoadingDots";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  themeClasses: any;
  userMessageStyle: React.CSSProperties;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  customMessageRenderer?: (message: ChatMessage, index: number) => React.ReactNode;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isTyping,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar,
  onFeedback,
  onCopy,
  themeClasses,
  userMessageStyle,
  messagesEndRef,
  customMessageRenderer
}) => (
  <>
    {messages.map((msg, idx) => {
      // Check if there's a custom renderer for this message
      if (customMessageRenderer) {
        const customContent = customMessageRenderer(msg, idx);
        if (customContent) {
          return <div key={idx}>{customContent}</div>;
        }
      }

      return (
        <ChatMessageComponent
          key={idx}
          message={msg}
          agentName={agentName}
          profilePicture={profilePicture}
          showFeedback={showFeedback}
          hideUserAvatar={hideUserAvatar}
          onFeedback={onFeedback}
          onCopy={onCopy}
          agentBubbleClass={themeClasses.agentMessage}
          userBubbleClass={themeClasses.userMessage}
          userMessageStyle={userMessageStyle}
        />
      );
    })}
    
    {isTyping && (
      <div className="flex mb-4">
        <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
          {profilePicture ? (
            <AvatarImage src={profilePicture} alt={agentName} />
          ) : (
            <AvatarFallback className="bg-gray-200 text-gray-600">
              {agentName.charAt(0)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className={`rounded-lg p-3 max-w-[80%] ${themeClasses.agentMessage}`}>
          <LoadingDots />
        </div>
      </div>
    )}
    
    {messagesEndRef && <div ref={messagesEndRef} />}
  </>
);

export default ChatMessages;
