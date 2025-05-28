
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatMessageAvatarProps {
  profilePicture?: string;
  agentName: string;
  isAgent: boolean;
  hideUserAvatar?: boolean;
}

const ChatMessageAvatar: React.FC<ChatMessageAvatarProps> = ({
  profilePicture,
  agentName,
  isAgent,
  hideUserAvatar = false
}) => {
  if (isAgent) {
    return (
      <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
        {profilePicture ? (
          <AvatarImage src={profilePicture} alt={agentName} />
        ) : (
          <AvatarFallback className="bg-gray-100" />
        )}
      </Avatar>
    );
  }

  if (!hideUserAvatar) {
    return (
      <Avatar className="h-8 w-8 ml-2 mt-1 border-0">
        <AvatarFallback className="bg-gray-100" />
      </Avatar>
    );
  }

  return null;
};

export default ChatMessageAvatar;
