
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ConversationEndedInputProps {
  onStartNewChat?: () => void;
  chatIcon?: string;
  isEmbedded: boolean;
  footer?: string;
  footerClassName: string;
  textClass: string;
  inputBackgroundClass: string;
  inputTextClass: string;
}

const ConversationEndedInput: React.FC<ConversationEndedInputProps> = ({
  onStartNewChat,
  chatIcon,
  isEmbedded,
  footer,
  footerClassName,
  textClass,
  inputBackgroundClass,
  inputTextClass
}) => {
  return (
    <div className="border-t p-4">
      <div className="flex items-center w-full gap-2">
        <input
          type="text"
          value=""
          placeholder="Your conversation has ended"
          className={`flex-1 border rounded-full px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary ${inputBackgroundClass} ${inputTextClass}`}
          disabled={true}
          readOnly
        />
        <Button 
          onClick={onStartNewChat}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-white hover:bg-gray-100 text-black border border-gray-300"
        >
          <Plus size={16} />
          Start new chat
        </Button>
      </div>
      
      {/* Chat Icon - Only show when not in embedded mode */}
      {chatIcon && !isEmbedded && (
        <div className="flex justify-end mt-3">
          <Avatar className="h-10 w-10 border-0">
            <AvatarImage src={chatIcon} alt="Chat Icon" />
            <AvatarFallback>💬</AvatarFallback>
          </Avatar>
        </div>
      )}
      
      {/* Footer */}
      {footer && (
        <div className={`mt-3 text-xs text-center ${textClass} ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default ConversationEndedInput;
