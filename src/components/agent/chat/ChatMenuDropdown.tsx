
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

      <Dialog open={showEndChatDialog} onOpenChange={setShowEndChatDialog}>
        <DialogContent className="bg-white max-w-sm mx-auto">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <X size={24} className="text-gray-600" />
              </div>
            </div>
            <DialogTitle className="text-lg font-semibold">End chat</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Do you want to end this chat?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 mt-6">
            <Button 
              onClick={handleConfirmEndChat}
              className="bg-black hover:bg-gray-800 text-white w-full"
            >
              Yes, end chat
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowEndChatDialog(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatMenuDropdown;
