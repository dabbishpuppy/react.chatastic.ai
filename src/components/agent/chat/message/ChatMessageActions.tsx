
import React from "react";
import { Copy, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";

interface ChatMessageActionsProps {
  messageId?: string;
  messageContent: string;
  feedback?: 'like' | 'dislike';
  showFeedback: boolean;
  allowRegenerate: boolean;
  isLastAgentMessage: boolean;
  isUpdatingFeedback: boolean;
  showCopiedTooltip: boolean;
  readOnly?: boolean;
  onFeedback: (type: "like" | "dislike") => void;
  onCopy: (content: string) => void;
  onRegenerate?: () => void;
  isInitialMessage?: boolean;
}

const ChatMessageActions: React.FC<ChatMessageActionsProps> = ({
  messageContent,
  feedback,
  showFeedback,
  allowRegenerate,
  isLastAgentMessage,
  isUpdatingFeedback,
  showCopiedTooltip,
  readOnly = false,
  onFeedback,
  onCopy,
  onRegenerate,
  isInitialMessage = false
}) => {
  // Don't show actions for initial messages or when feedback is disabled
  if (!showFeedback || isInitialMessage) {
    console.log('🚫 ChatMessageActions - Not showing actions:', {
      showFeedback,
      isInitialMessage
    });
    return null;
  }

  const handleFeedbackClick = (type: "like" | "dislike") => {
    onFeedback(type);
  };

  const handleCopyClick = () => {
    if (readOnly) return;
    onCopy(messageContent);
  };

  const handleRegenerateClick = () => {
    if (readOnly || !onRegenerate) return;
    onRegenerate();
  };

  return (
    <div className="flex items-center space-x-1 mt-2">
      <button
        onClick={() => handleFeedbackClick("like")}
        disabled={isUpdatingFeedback}
        className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 ${
          feedback === "like" 
            ? "bg-green-100 text-green-600 hover:bg-green-200"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300 cursor-pointer"
        } disabled:opacity-50`}
        title="Like"
      >
        <ThumbsUp size={14} />
      </button>
      
      <button
        onClick={() => handleFeedbackClick("dislike")}
        disabled={isUpdatingFeedback}
        className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 ${
          feedback === "dislike" 
            ? "bg-red-100 text-red-600 hover:bg-red-200"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300 cursor-pointer"
        } disabled:opacity-50`}
        title="Dislike"
      >
        <ThumbsDown size={14} />
      </button>
      
      <div className="relative">
        <button
          onClick={handleCopyClick}
          disabled={readOnly}
          className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 ${
            readOnly 
              ? "bg-gray-100 text-gray-400 cursor-default"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300 cursor-pointer"
          }`}
          title={readOnly ? "Copy (disabled in view mode)" : "Copy"}
        >
          <Copy size={14} />
        </button>
        {showCopiedTooltip && !readOnly && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            Copied!
          </div>
        )}
      </div>
      
      {allowRegenerate && isLastAgentMessage && onRegenerate && (
        <button
          onClick={handleRegenerateClick}
          disabled={readOnly}
          className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 ${
            readOnly 
              ? "bg-gray-100 text-gray-400 cursor-default"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300 cursor-pointer"
          }`}
          title={readOnly ? "Regenerate (disabled in view mode)" : "Regenerate"}
        >
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
};

export default ChatMessageActions;
