
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage as ChatMessageType } from "@/types/chatInterface";
import { Copy, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar,
  onFeedback,
  onCopy,
  onRegenerate,
  allowRegenerate = false,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle,
  isInitialMessage = false,
  isLastAgentMessage = false
}) => {
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);

  const handleCopy = async (content: string) => {
    try {
      // Try the modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      onCopy(content);
      setShowCopiedTooltip(true);
      toast({
        description: "Copied to clipboard!",
        duration: 2000,
      });
      setTimeout(() => setShowCopiedTooltip(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        description: "Failed to copy to clipboard",
        duration: 2000,
        variant: "destructive"
      });
    }
  };

  // Show feedback buttons for all agent messages when showFeedback is true
  const shouldShowFeedback = message.isAgent && showFeedback;

  return (
    <div className={`flex mb-4 ${message.isAgent ? '' : 'justify-end'}`}>
      {message.isAgent && (
        <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
          {profilePicture ? (
            <AvatarImage src={profilePicture} alt={agentName} />
          ) : (
            <AvatarFallback className="bg-gray-100" />
          )}
        </Avatar>
      )}
      
      <div className="flex flex-col max-w-[80%]">
        {/* Message bubble - contains ONLY the message content */}
        <div 
          className={`rounded-lg p-3 text-[0.875rem] ${
            message.isAgent ? agentBubbleClass : userBubbleClass
          }`}
          style={message.isAgent ? {} : userMessageStyle}
        >
          {message.content}
        </div>
        
        {/* Feedback buttons - positioned OUTSIDE the message bubble */}
        {shouldShowFeedback && (
          <div className="flex items-center space-x-1 mt-2">
            {/* Like button - FIRST */}
            <button
              onClick={() => onFeedback(message.timestamp, "like")}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 ${
                message.feedback === "like" 
                  ? "bg-green-100 text-green-600 hover:bg-green-200" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300"
              }`}
              title="Like"
            >
              <ThumbsUp size={14} />
            </button>
            
            {/* Dislike button - SECOND */}
            <button
              onClick={() => onFeedback(message.timestamp, "dislike")}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 ${
                message.feedback === "dislike" 
                  ? "bg-red-100 text-red-600 hover:bg-red-200" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300"
              }`}
              title="Dislike"
            >
              <ThumbsDown size={14} />
            </button>
            
            {/* Copy button - THIRD */}
            <div className="relative">
              <button
                onClick={() => handleCopy(message.content)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300 transition-all duration-200"
                title="Copy"
              >
                <Copy size={14} />
              </button>
              {showCopiedTooltip && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  Copied!
                </div>
              )}
            </div>
            
            {/* Regenerate button - FOURTH (last agent message when allowed) */}
            {allowRegenerate && isLastAgentMessage && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300 transition-all duration-200"
                title="Regenerate"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        )}
      </div>
      
      {!message.isAgent && !hideUserAvatar && (
        <Avatar className="h-8 w-8 ml-2 mt-1 border-0">
          <AvatarFallback className="bg-gray-100" />
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;
