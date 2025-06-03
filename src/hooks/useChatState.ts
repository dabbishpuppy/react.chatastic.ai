
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
        timestamp: new Date().toISOString(),
        id: 'initial-message'
      }
    ];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<number | null>(null);
  const [isWaitingForRateLimit, setIsWaitingForRateLimit] = useState(false);
  const [userHasMessaged, setUserHasMessaged] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to add a message with typing effect
  const addMessageWithTyping = (content: string, isAgent: boolean = true) => {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (isAgent) {
      // Start thinking state
      setIsThinking(true);
      setIsTyping(false);
      setTypingMessageId(null);

      // After thinking period, add message and start typing
      setTimeout(() => {
        const newMessage: ChatMessage = {
          id: messageId,
          isAgent: true,
          content,
          timestamp: new Date().toISOString()
        };

        setChatHistory(prev => [...prev, newMessage]);
        setIsThinking(false);
        setIsTyping(true);
        setTypingMessageId(messageId);
      }, 1500); // 1.5 second thinking period
    } else {
      // User messages don't need typing effect
      const newMessage: ChatMessage = {
        id: messageId,
        isAgent: false,
        content,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, newMessage]);
    }

    return messageId;
  };

  // Helper function to handle typing complete
  const handleTypingComplete = (messageId: string) => {
    if (messageId === typingMessageId) {
      setIsTyping(false);
      setTypingMessageId(null);
    }
  };

  return {
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    setIsTyping,
    isThinking,
    setIsThinking,
    typingMessageId,
    setTypingMessageId,
    rateLimitError,
    setRateLimitError,
    timeUntilReset,
    setTimeUntilReset,
    isWaitingForRateLimit,
    setIsWaitingForRateLimit,
    userHasMessaged,
    setUserHasMessaged,
    inputRef,
    countdownIntervalRef,
    addMessageWithTyping,
    handleTypingComplete
  };
};
