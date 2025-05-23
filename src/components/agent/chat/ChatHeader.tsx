
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings } from "lucide-react";

interface ChatHeaderProps {
  agentName: string;
  profilePicture?: string;
  allowRegenerate: boolean;
  toggleSettings?: () => void;
  onRegenerate: () => void;
  headerColor?: string | null;
  backgroundColor: string;
  iconButtonClass: string;
}

// Helper function to determine contrasting text color for a background
function getContrastColor(hex: string): string {
  let r = 0, g = 0, b = 0;
  
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  agentName,
  profilePicture,
  allowRegenerate,
  toggleSettings,
  onRegenerate,
  headerColor,
  backgroundColor,
  iconButtonClass
}) => (
  <div 
    className={`p-4 border-b flex items-center justify-between flex-shrink-0 ${backgroundColor}`}
    style={headerColor ? { backgroundColor: headerColor, color: getContrastColor(headerColor) } : {}}
  >
    <div className="flex items-center gap-2">
      <Avatar className="h-10 w-10 border-0">
        {profilePicture ? (
          <AvatarImage src={profilePicture} alt={agentName} />
        ) : (
          <AvatarFallback className="bg-gray-200 text-gray-600">
            {agentName.charAt(0)}
          </AvatarFallback>
        )}
      </Avatar>
      <span className={headerColor ? "" : `font-medium text-gray-800`}>{agentName}</span>
    </div>
    <div className="flex items-center gap-2">
      {allowRegenerate && (
        <Button 
          variant="ghost" 
          size="icon" 
          className={headerColor ? "text-inherit hover:bg-white/20" : `h-9 w-9 ${iconButtonClass}`} 
          onClick={onRegenerate}
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      )}
      {toggleSettings && (
        <Button 
          variant="ghost" 
          size="icon" 
          className={headerColor ? "text-inherit hover:bg-white/20" : `h-9 w-9 ${iconButtonClass}`}
          onClick={toggleSettings}
        >
          <Settings className="h-5 w-5" />
        </Button>
      )}
    </div>
  </div>
);

export default ChatHeader;
