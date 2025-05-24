
import React from "react";
import { Button } from "@/components/ui/button";
import { SendIcon, Smile, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isWaitingForRateLimit: boolean;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement>;
  chatIcon?: string;
  isEmbedded: boolean;
  footer?: string;
  footerClassName: string;
  theme: 'light' | 'dark' | 'system';
  inputBackgroundClass: string;
  inputTextClass: string;
  iconButtonClass: string;
  textClass: string;
  onEmojiInsert: (emoji: string) => void;
  isConversationEnded?: boolean;
  onStartNewChat?: () => void;
}

// Emoji list for the emoji picker
const emojis = ["😊", "👍", "👋", "🙏", "❤️", "🎉", "🔥", "✨", "🤔", "😂", "🚀", "👏", "🌟", "💡", "👀", "💪", "🙌", "👌", "💯", "🎯"];

const ChatInput: React.FC<ChatInputProps> = ({
  message,
  setMessage,
  onSubmit,
  isWaitingForRateLimit,
  placeholder,
  inputRef,
  chatIcon,
  isEmbedded,
  footer,
  footerClassName,
  theme,
  inputBackgroundClass,
  inputTextClass,
  iconButtonClass,
  textClass,
  onEmojiInsert,
  isConversationEnded = false,
  onStartNewChat
}) => {
  // Handle input change - properly handle space and other characters
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  // Handle key press for form submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !isWaitingForRateLimit) {
        onSubmit(e as any);
      }
    }
    // Allow space and other keys to work normally - don't prevent default
  };

  // Handle send button click
  const handleSendClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (message.trim() && !isWaitingForRateLimit) {
      const syntheticEvent = {
        preventDefault: () => {},
        stopPropagation: () => {}
      } as React.FormEvent;
      onSubmit(syntheticEvent);
    }
  };

  // Determine the actual placeholder text to show
  const getPlaceholderText = () => {
    if (isConversationEnded) {
      return "Your conversation has ended";
    }
    if (isWaitingForRateLimit) {
      return "Checking rate limit...";
    }
    return placeholder;
  };

  // If conversation is ended, show different UI
  if (isConversationEnded) {
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
  }

  return (
    <div className="border-t p-4">
      <form onSubmit={onSubmit} className="flex items-center w-full relative">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className={`absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 z-10 ${iconButtonClass}`}
              disabled={isWaitingForRateLimit}
              type="button"
            >
              <Smile size={18} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={`w-64 p-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}>
            <div className="grid grid-cols-5 gap-2">
              {emojis.map((emoji, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className={`h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  onClick={() => onEmojiInsert(emoji)}
                  disabled={isWaitingForRateLimit}
                  type="button"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholderText()}
          className={`w-full border rounded-full px-4 py-3 pr-12 pl-10 focus:outline-none focus:ring-1 focus:ring-primary ${inputBackgroundClass} ${inputTextClass}`}
          disabled={isWaitingForRateLimit}
          autoComplete="off"
          spellCheck="false"
        />
        <Button 
          type="button" 
          size="sm" 
          variant="ghost"
          className={`absolute right-1 rounded-full h-8 w-8 ${iconButtonClass}`}
          disabled={!message.trim() || isWaitingForRateLimit}
          onClick={handleSendClick}
        >
          <SendIcon size={16} />
        </Button>
      </form>
      
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

export default ChatInput;
