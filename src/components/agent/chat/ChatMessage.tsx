
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage as ChatMessageType } from "@/types/chatInterface";
import { Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
}) => {
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);

  const handleCopy = (content: string) => {
    onCopy(content);
    setShowCopiedTooltip(true);
    toast({
      description: "Copied to clipboard!",
      duration: 2000,
    });
    setTimeout(() => setShowCopiedTooltip(false), 2000);
  };

  return (
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
      
      <div className="flex flex-col">
        {/* Message bubble */}
        <div 
          className={`rounded-lg p-3 text-[0.875rem] max-w-[80%] ${
            message.isAgent ? agentBubbleClass : userBubbleClass
          }`}
          style={message.isAgent ? {} : userMessageStyle}
        >
          {message.content}
        </div>
        
        {/* Feedback buttons - positioned outside the message bubble */}
        {message.isAgent && showFeedback && (
          <div className="flex items-center space-x-1 mt-2 ml-0">
            {/* Copy button */}
            <div className="relative">
              <button
                onClick={() => handleCopy(message.content)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 p-2 rounded-md"
                title="Copy"
              >
                <Copy size={16} />
              </button>
              {showCopiedTooltip && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Copied!
                </div>
              )}
            </div>
            
            {/* Like button */}
            <button
              onClick={() => onFeedback(message.timestamp, "like")}
              className={`transition-all duration-200 p-2 rounded-md ${
                message.feedback === "like" 
                  ? "text-green-600 bg-green-50" 
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
              title="Like"
            >
              <ThumbsUp size={16} />
            </button>
            
            {/* Dislike button */}
            <button
              onClick={() => onFeedback(message.timestamp, "dislike")}
              className={`transition-all duration-200 p-2 rounded-md ${
                message.feedback === "dislike" 
                  ? "text-red-600 bg-red-50" 
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
              title="Dislike"
            >
              <ThumbsDown size={16} />
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
};

export default ChatMessage;
