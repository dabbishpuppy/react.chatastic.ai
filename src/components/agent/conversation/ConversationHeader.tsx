
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ConversationHeaderProps {
  conversation: {
    title: string;
    daysAgo: string;
    source: string;
  };
  displayName: string;
  profilePicture?: string;
  conversationStatus?: string;
  showDeleteButton: boolean;
  theme: 'light' | 'dark';
  onDeleteClick: () => void;
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  displayName,
  profilePicture,
  conversationStatus,
  showDeleteButton,
  theme,
  onDeleteClick
}) => {
  return (
    <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          {profilePicture ? (
            <AvatarImage src={profilePicture} alt={displayName} />
          ) : (
            <AvatarFallback className="bg-gray-100" />
          )}
        </Avatar>
        <div>
          <h2 className="text-lg font-semibold">{conversation.title}</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{conversation.daysAgo}</span>
            <span>•</span>
            <span>{conversation.source}</span>
            {conversationStatus && (
              <>
                <span>•</span>
                <span className="capitalize">{conversationStatus}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {showDeleteButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteClick}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConversationHeader;
