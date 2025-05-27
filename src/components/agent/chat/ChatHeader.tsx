
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getContrastColor } from "./ThemeConfig";
import ChatMenuDropdown from "./ChatMenuDropdown";
import RecentChatsOverlay from "./RecentChatsOverlay";

interface ChatHeaderProps {
  agentName: string;
  profilePicture?: string;
  allowRegenerate: boolean;
  toggleSettings?: () => void;
  onRegenerate: () => void;
  headerColor?: string | null;
  backgroundColor: string;
  iconButtonClass: string;
  // New props for conversation management
  onStartNewChat?: () => void;
  onEndChat?: () => void;
  onLoadConversation?: (conversationId: string) => void;
  agentId?: string;
  isConversationEnded?: boolean;
  isEmbedded?: boolean;
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
  isConversationEnded = false,
  isEmbedded = false
}) => {
  const [showRecentChats, setShowRecentChats] = useState(false);

  // Determine header background and text color
  const hasCustomHeader = headerColor && headerColor !== backgroundColor;
  const headerStyle = hasCustomHeader ? {
    backgroundColor: headerColor,
    color: getContrastColor(headerColor)
  } : {};

  const handleViewRecentChats = () => {
    setShowRecentChats(true);
  };

  const handleSelectConversation = (conversationId: string) => {
    if (onLoadConversation) {
      onLoadConversation(conversationId);
    }
  };

  // Show conversation ended message if conversation is ended
  const showEndedMessage = isConversationEnded && !isEmbedded;

  return (
    <>
      <div 
        className={`p-4 border-b ${hasCustomHeader ? '' : backgroundColor}`}
        style={headerStyle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8 border-0">
              {profilePicture ? (
                <AvatarImage src={profilePicture} alt={agentName} />
              ) : (
                <AvatarFallback className="bg-gray-200 text-gray-600">
                  {agentName.charAt(0)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h3 className="font-medium">{agentName}</h3>
              {showEndedMessage && (
                <p className="text-xs text-gray-500">This conversation has ended</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Three-dot menu */}
            {(onStartNewChat || onEndChat || (onLoadConversation && agentId)) && (
              <ChatMenuDropdown
                onStartNewChat={onStartNewChat || (() => {})}
                onEndChat={onEndChat || (() => {})}
                onViewRecentChats={handleViewRecentChats}
                isConversationEnded={isConversationEnded}
                isEmbedded={isEmbedded}
              />
            )}
          </div>
        </div>
      </div>

      {/* Recent Chats Overlay */}
      {agentId && (
        <RecentChatsOverlay
          isOpen={showRecentChats}
          onClose={() => setShowRecentChats(false)}
          agentId={agentId}
          onSelectConversation={handleSelectConversation}
          isEmbedded={isEmbedded}
        />
      )}
    </>
  );
};

export default ChatHeader;
