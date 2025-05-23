
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types/chatInterface";
import ChatMessageComponent from "./ChatMessage";
import LoadingDots from "./LoadingDots";

interface ChatMessagesProps {
  chatHistory: ChatMessage[];
  isTyping: boolean;
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle: React.CSSProperties;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  chatHistory,
  isTyping,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar,
  onFeedback,
  onCopy,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle,
  messagesEndRef
}) => (
  <>
    {chatHistory.map((msg, idx) => (
      <ChatMessageComponent
        key={idx}
        message={msg}
        agentName={agentName}
        profilePicture={profilePicture}
        showFeedback={showFeedback}
        hideUserAvatar={hideUserAvatar}
        onFeedback={onFeedback}
        onCopy={onCopy}
        agentBubbleClass={agentBubbleClass}
        userBubbleClass={userBubbleClass}
        userMessageStyle={userMessageStyle}
      />
    ))}
    
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
        <div className={`rounded-lg p-3 max-w-[80%] ${agentBubbleClass}`}>
          <LoadingDots />
        </div>
      </div>
    )}
    
    <div ref={messagesEndRef} />
  </>
);

export default ChatMessages;
