
import React from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ChatMenuDropdown from "./ChatMenuDropdown";

interface ChatHeaderProps {
  agentName: string;
  profilePicture?: string;
  allowRegenerate: boolean;
  toggleSettings?: () => void;
  onRegenerate: () => void;
  headerColor: string | null;
  backgroundColor: string;
  iconButtonClass: string;
  onStartNewChat: () => void;
  onEndChat: () => void;
  onLoadConversation: (conversationId: string) => void;
  agentId: string;
  isConversationEnded: boolean;
  isEmbedded: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  agentName,
  profilePicture,
  allowRegenerate,
  toggleSettings,
  onRegenerate,
  headerColor,
  backgroundColor,
  iconButtonClass,
  onStartNewChat,
  onEndChat,
  onLoadConversation,
  agentId,
  isConversationEnded,
  isEmbedded
}) => {
  const headerStyle = headerColor ? { backgroundColor: headerColor } : {};
  const textColor = headerColor ? 'text-white' : 'text-gray-900';

  return (
    <div 
      className="flex items-center justify-between p-4 border-b"
      style={headerStyle}
    >
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          {profilePicture ? (
            <AvatarImage src={profilePicture} alt={agentName} />
          ) : (
            <AvatarFallback className="bg-gray-100">
              {agentName.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <h2 className={`text-lg font-semibold ${textColor}`}>
          {agentName}
        </h2>
      </div>
      
      <div className="flex items-center space-x-2">
        {allowRegenerate && !isConversationEnded && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRegenerate}
            className={iconButtonClass}
          >
            <RefreshCw size={16} />
          </Button>
        )}
        
        <ChatMenuDropdown
          onStartNewChat={onStartNewChat}
          onEndChat={onEndChat}
          onLoadConversation={onLoadConversation}
          agentId={agentId}
          isConversationEnded={isConversationEnded}
          isEmbedded={isEmbedded}
          toggleSettings={toggleSettings}
          iconButtonClass={iconButtonClass}
        />
      </div>
    </div>
  );
};

export default ChatHeader;
