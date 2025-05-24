
import React, { useState } from "react";
import { MoreVertical, MessageSquarePlus, X, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatMenuDropdownProps {
  onStartNewChat: () => void;
  onEndChat: () => void;
  onViewRecentChats: () => void;
  isConversationEnded: boolean;
  isEmbedded?: boolean;
}

const ChatMenuDropdown: React.FC<ChatMenuDropdownProps> = ({
  onStartNewChat,
  onEndChat,
  onViewRecentChats,
  isConversationEnded,
  isEmbedded = false
}) => {
  const [showEndChatDialog, setShowEndChatDialog] = useState(false);

  const handleEndChatClick = () => {
    setShowEndChatDialog(true);
  };

  const handleConfirmEndChat = () => {
    setShowEndChatDialog(false);
    onEndChat();
  };

  const iconSize = isEmbedded ? 16 : 18;
  const buttonSize = isEmbedded ? "sm" : "default";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`${isEmbedded ? 'h-8 w-8' : 'h-9 w-9'} hover:bg-gray-100`}
          >
            <MoreVertical size={iconSize} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-48 bg-white border shadow-lg z-50"
        >
          <DropdownMenuItem 
            onClick={onStartNewChat}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50"
          >
            <MessageSquarePlus size={16} />
            Start new chat
          </DropdownMenuItem>
          {!isConversationEnded && (
            <DropdownMenuItem 
              onClick={handleEndChatClick}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50"
            >
              <X size={16} />
              End chat
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={onViewRecentChats}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50"
          >
            <History size={16} />
            View recent chats
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showEndChatDialog} onOpenChange={setShowEndChatDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>End this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the current conversation. You can start a new chat anytime or view this conversation in your chat history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmEndChat}
              className="bg-red-600 hover:bg-red-700"
            >
              End chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChatMenuDropdown;
