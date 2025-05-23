
import React from "react";
import { Button } from "@/components/ui/button";

interface SuggestedMessagesProps {
  messages: string[];
  onMessageClick: (message: string) => void;
  isWaitingForRateLimit: boolean;
  theme: 'light' | 'dark' | 'system';
  backgroundColor: string;
}

const SuggestedMessages: React.FC<SuggestedMessagesProps> = ({
  messages,
  onMessageClick,
  isWaitingForRateLimit,
  theme,
  backgroundColor
}) => (
  <div className={`p-4 border-t ${backgroundColor}`}>
    <div className="flex flex-wrap gap-2">
      {messages.map((suggestion, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          className={`rounded-full text-sm ${theme === 'dark' ? 'border-gray-700 text-gray-300' : ''}`}
          onClick={() => onMessageClick(suggestion)}
          disabled={isWaitingForRateLimit}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  </div>
);

export default SuggestedMessages;
