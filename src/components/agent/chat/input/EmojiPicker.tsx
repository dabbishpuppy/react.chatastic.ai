
import React from "react";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface EmojiPickerProps {
  onEmojiInsert: (emoji: string) => void;
  isDisabled: boolean;
  theme: 'light' | 'dark' | 'system';
  iconButtonClass: string;
}

// Emoji list for the emoji picker
const emojis = ["😊", "👍", "👋", "🙏", "❤️", "🎉", "🔥", "✨", "🤔", "😂", "🚀", "👏", "🌟", "💡", "👀", "💪", "🙌", "👌", "💯", "🎯"];

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiInsert,
  isDisabled,
  theme,
  iconButtonClass
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={`absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 z-10 ${iconButtonClass}`}
          disabled={isDisabled}
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
              disabled={isDisabled}
              type="button"
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
