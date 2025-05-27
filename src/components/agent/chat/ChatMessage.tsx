
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage as ChatMessageType } from "@/types/chatInterface";

interface ChatMessageProps {
  message: ChatMessageType;
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar: boolean;
  onFeedback: (timestamp: string, type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle: React.CSSProperties;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar,
  onFeedback,
  onCopy,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle
}) => (
  <div className={`flex mb-4 ${message.isAgent ? '' : 'justify-end'}`}>
    {message.isAgent && (
      <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
        {profilePicture ? (
          <AvatarImage src={profilePicture} alt={agentName} />
        ) : (
          <AvatarFallback className="bg-gray-200 text-gray-600">
            {agentName.charAt(0)}
          </AvatarFallback>
        )}
      </Avatar>
    )}
    <div className="flex flex-col max-w-[80%]">
      <div 
        className={`rounded-lg p-3 text-[0.875rem] ${
          message.isAgent ? agentBubbleClass : userBubbleClass
        }`}
        style={message.isAgent ? {} : userMessageStyle}
      >
        {message.content}
      </div>
      
      {/* Message actions for agent messages - emoji icons under AI response */}
      {message.isAgent && showFeedback && (
        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-400">
          <button
            onClick={() => onCopy(message.content)}
            className="hover:text-gray-600 transition-colors"
            title="Copy"
          >
            📋
          </button>
          <button
            onClick={() => onFeedback(message.timestamp, "like")}
            className={`hover:text-gray-600 transition-colors ${
              message.feedback === "like" ? "text-green-600" : ""
            }`}
            title="Like"
          >
            👍
          </button>
          <button
            onClick={() => onFeedback(message.timestamp, "dislike")}
            className={`hover:text-gray-600 transition-colors ${
              message.feedback === "dislike" ? "text-red-600" : ""
            }`}
            title="Dislike"
          >
            👎
          </button>
        </div>
      )}
    </div>
    
    {!message.isAgent && !hideUserAvatar && (
      <Avatar className="h-8 w-8 ml-2 mt-1 border-0">
        <AvatarFallback className="bg-gray-200 text-gray-600">U</AvatarFallback>
      </Avatar>
    )}
  </div>
);

export default ChatMessage;
