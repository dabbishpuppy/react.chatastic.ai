
import { useState, useRef } from "react";
import { ChatMessage } from "@/types/chatInterface";

export const useChatState = (
  initialMessages: ChatMessage[] = [],
  isEmbedded: boolean = false
) => {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    if (initialMessages.length) {
      return initialMessages;
    }
    
    return [
      {
        isAgent: true,
        content: "Hi! I'm Wonder AI. How can I help you today?",
        timestamp: new Date().toISOString()
      },
      {
        isAgent: false,
        content: "Hello, World!",
        timestamp: new Date(Date.now() + 1000).toISOString()
      }
    ];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<number | null>(null);
  const [isWaitingForRateLimit, setIsWaitingForRateLimit] = useState(false);
  const [userHasMessaged, setUserHasMessaged] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  return {
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    setIsTyping,
    rateLimitError,
    setRateLimitError,
    timeUntilReset,
    setTimeUntilReset,
    isWaitingForRateLimit,
    setIsWaitingForRateLimit,
    userHasMessaged,
    setUserHasMessaged,
    inputRef,
    countdownIntervalRef
  };
};
