
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
      
      {/* Message actions for agent messages */}
      {message.isAgent && showFeedback && (
        <div className="flex mt-1 space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onFeedback(message.timestamp, "like")}
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 rounded-full ${message.feedback === "like" ? "bg-green-100" : ""}`}
                >
                  <ThumbsUp size={14} className={message.feedback === "like" ? "text-green-600" : "text-gray-500"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Like</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onFeedback(message.timestamp, "dislike")}
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 rounded-full ${message.feedback === "dislike" ? "bg-red-100" : ""}`}
                >
                  <ThumbsDown size={14} className={message.feedback === "dislike" ? "text-red-600" : "text-gray-500"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Dislike</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onCopy(message.content)}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full"
                >
                  <Copy size={14} className="text-gray-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
