
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatFooterElementsProps {
  chatIcon?: string;
  isEmbedded: boolean;
  footer?: string;
  footerClassName: string;
  textClass: string;
}

const ChatFooterElements: React.FC<ChatFooterElementsProps> = ({
  chatIcon,
  isEmbedded,
  footer,
  footerClassName,
  textClass
}) => {
  return (
    <>
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
    </>
  );
};

export default ChatFooterElements;
