
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingDots from "../LoadingDots";

interface TypingIndicatorProps {
  isTyping: boolean;
  agentName: string;
  profilePicture?: string;
  agentBubbleClass: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isTyping,
  agentName,
  profilePicture,
  agentBubbleClass,
  messagesEndRef
}) => {
  if (!isTyping) return null;

  return (
    <>
      <div className="flex mb-4">
        <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
          {profilePicture ? (
            <AvatarImage src={profilePicture} alt={agentName} />
          ) : (
            <AvatarFallback className="bg-gray-100" />
          )}
        </Avatar>
        <div className={`rounded-lg p-3 max-w-[80%] ${agentBubbleClass}`}>
          <LoadingDots />
        </div>
      </div>
      <div ref={messagesEndRef} />
    </>
  );
};

export default TypingIndicator;
