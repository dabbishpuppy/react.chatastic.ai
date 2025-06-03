
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ThinkingBubbleProps {
  agentName: string;
  profilePicture?: string;
  agentBubbleClass: string;
}

const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({
  agentName,
  profilePicture,
  agentBubbleClass
}) => {
  return (
    <div className="flex mb-4">
      <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
        {profilePicture ? (
          <AvatarImage src={profilePicture} alt={agentName} />
        ) : (
          <AvatarFallback className="bg-gray-100" />
        )}
      </Avatar>
      <div className={`rounded-lg p-3 max-w-[80%] ${agentBubbleClass}`}>
        <div className="flex space-x-1 items-center">
          <div 
            className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" 
            style={{animationDelay: "0ms", animationDuration: "1.5s"}}
          ></div>
          <div 
            className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" 
            style={{animationDelay: "500ms", animationDuration: "1.5s"}}
          ></div>
          <div 
            className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" 
            style={{animationDelay: "1000ms", animationDuration: "1.5s"}}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ThinkingBubble;
