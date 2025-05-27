
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { analyticsService } from "@/services/analyticsService";

export interface SharedChatMessageProps {
  message: {
    id?: string;
    content: string;
    isAgent?: boolean;
    role?: 'user' | 'assistant';
    timestamp: string;
    feedback?: 'like' | 'dislike';
  };
  agentName: string;
  profilePicture?: string;
  showFeedback: boolean;
  hideUserAvatar?: boolean;
  onFeedback?: (timestamp: string, type: "like" | "dislike") => void;
  onCopy?: (content: string) => void;
  onRegenerate?: () => void;
  allowRegenerate?: boolean;
  agentBubbleClass: string;
  userBubbleClass: string;
  userMessageStyle?: React.CSSProperties;
  isInitialMessage?: boolean;
  isLastAgentMessage?: boolean;
  theme?: 'light' | 'dark';
}

const SharedChatMessage: React.FC<SharedChatMessageProps> = ({
  message,
  agentName,
  profilePicture,
  showFeedback,
  hideUserAvatar = false,
  onFeedback,
  onCopy,
  onRegenerate,
  allowRegenerate = false,
  agentBubbleClass,
  userBubbleClass,
  userMessageStyle = {},
  isInitialMessage = false,
  isLastAgentMessage = false,
  theme = 'light'
}) => {
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState(false);

  // Determine if this is an agent message
  const isAgent = message.isAgent !== undefined ? message.isAgent : message.role === 'assistant';

  const handleCopy = async (content: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
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
      
      if (onCopy) onCopy(content);
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

  const handleFeedback = async (type: "like" | "dislike") => {
    if (isUpdatingFeedback || !onFeedback) return;

    setIsUpdatingFeedback(true);
    try {
      if (message.id && message.id !== 'initial-message') {
        const newFeedback = message.feedback === type ? null : type;
        
        const success = await analyticsService.updateMessageFeedback(message.id, newFeedback);
        
        if (success) {
          onFeedback(message.timestamp, type);
          toast({
            description: newFeedback ? `Feedback ${type === 'like' ? 'liked' : 'disliked'}` : "Feedback removed",
            duration: 2000,
          });
        } else {
          toast({
            description: "Failed to update feedback",
            duration: 2000,
            variant: "destructive"
          });
        }
      } else {
        onFeedback(message.timestamp, type);
        toast({
          description: `Feedback ${type === 'like' ? 'liked' : 'disliked'} (local only)`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast({
        description: "Failed to update feedback",
        duration: 2000,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingFeedback(false);
    }
  };

  const shouldShowFeedback = isAgent && showFeedback;

  return (
    <div className={`flex mb-4 ${isAgent ? '' : 'justify-end'}`}>
      {isAgent && (
        <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
          {profilePicture ? (
            <AvatarImage src={profilePicture} alt={agentName} />
          ) : (
            <AvatarFallback className="bg-gray-100" />
          )}
        </Avatar>
      )}
      
      <div className="flex flex-col max-w-[80%]">
        <div 
          className={`rounded-lg p-3 text-[0.875rem] ${
            isAgent ? agentBubbleClass : userBubbleClass
          }`}
          style={isAgent ? {} : userMessageStyle}
        >
          {message.content}
        </div>
        
        {shouldShowFeedback && (
          <div className="flex items-center space-x-1 mt-2">
            <button
              onClick={() => handleFeedback("like")}
              disabled={isUpdatingFeedback}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 ${
                message.feedback === "like" 
                  ? "bg-green-100 text-green-600 hover:bg-green-200" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300"
              } disabled:opacity-50`}
              title="Like"
            >
              <ThumbsUp size={14} />
            </button>
            
            <button
              onClick={() => handleFeedback("dislike")}
              disabled={isUpdatingFeedback}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 ${
                message.feedback === "dislike" 
                  ? "bg-red-100 text-red-600 hover:bg-red-200" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300"
              } disabled:opacity-50`}
              title="Dislike"
            >
              <ThumbsDown size={14} />
            </button>
            
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
      
      {!isAgent && !hideUserAvatar && (
        <Avatar className="h-8 w-8 ml-2 mt-1 border-0">
          <AvatarFallback className="bg-gray-100" />
        </Avatar>
      )}
    </div>
  );
};

export default SharedChatMessage;
