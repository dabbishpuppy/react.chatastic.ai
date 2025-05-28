
import React from "react";
import { Button } from "@/components/ui/button";
import { SendIcon } from "lucide-react";
import EmojiPicker from "./EmojiPicker";

interface ChatInputFieldProps {
  message: string;
  setMessage: (message: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement>;
  isDisabled: boolean;
  isSubmitting: boolean;
  theme: 'light' | 'dark' | 'system';
  inputBackgroundClass: string;
  inputTextClass: string;
  iconButtonClass: string;
  onEmojiInsert: (emoji: string) => void;
}

const ChatInputField: React.FC<ChatInputFieldProps> = ({
  message,
  setMessage,
  onSubmit,
  placeholder,
  inputRef,
  isDisabled,
  isSubmitting,
  theme,
  inputBackgroundClass,
  inputTextClass,
  iconButtonClass,
  onEmojiInsert
}) => {
  // Handle input change - properly handle space and other characters
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSubmitting) {
      setMessage(e.target.value);
    }
  };

  // Handle key press for form submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !isDisabled) {
        console.log('⌨️ Enter key pressed, submitting message');
        onSubmit(e as any);
      } else {
        console.log('🚫 Enter key blocked:', {
          emptyMessage: !message.trim(),
          isDisabled
        });
      }
    }
  };

  // Handle send button click with enhanced logging
  const handleSendClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (message.trim() && !isDisabled) {
      console.log('🖱️ Send button clicked, submitting message');
      const syntheticEvent = {
        preventDefault: () => {},
        stopPropagation: () => {}
      } as React.FormEvent;
      onSubmit(syntheticEvent);
    } else {
      console.log('🚫 Send button click blocked:', {
        emptyMessage: !message.trim(),
        isDisabled
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center w-full relative">
      <EmojiPicker
        onEmojiInsert={onEmojiInsert}
        isDisabled={isDisabled}
        theme={theme}
        iconButtonClass={iconButtonClass}
      />
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full border rounded-full px-4 py-3 pr-12 pl-10 focus:outline-none focus:ring-1 focus:ring-primary ${inputBackgroundClass} ${inputTextClass}`}
        disabled={isDisabled}
        autoComplete="off"
        spellCheck="false"
      />
      <Button 
        type="button" 
        size="sm" 
        variant="ghost"
        className={`absolute right-1 rounded-full h-8 w-8 ${iconButtonClass} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={!message.trim() || isDisabled}
        onClick={handleSendClick}
      >
        <SendIcon size={16} />
      </Button>
    </form>
  );
};

export default ChatInputField;
