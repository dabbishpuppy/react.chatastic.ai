import { useState, useRef } from "react";
import { ChatMessage } from "@/types/chatInterface";

export const useMessageHandling = (
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

  const proceedWithMessage = (text: string) => {
    console.log('Proceeding with message:', text);
    
    setChatHistory(prev => [...prev, {
      isAgent: false,
      content: text,
      timestamp: new Date().toISOString()
    }]);
    
    setUserHasMessaged(true);
    setIsTyping(true);
    
    // Reset waiting state immediately to re-enable input
    setIsWaitingForRateLimit(false);
    
    // Focus input field after clearing message
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
    
    setTimeout(() => {
      setIsTyping(false);
      setChatHistory(prev => [...prev, {
        isAgent: true,
        content: "I'm here to help you with any questions or tasks!",
        timestamp: new Date().toISOString()
      }]);
      
      // Focus input field again after agent response
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      
      if (isEmbedded && window.self !== window.top) {
        setTimeout(() => {
          window.parent.postMessage({ type: 'message-sent' }, '*');
        }, 100);
      }
    }, 1500);
  };

  const submitMessage = (text: string, sendMessageToParent?: (message: string) => void) => {
    console.log('Submitting message:', text, 'isEmbedded:', isEmbedded);
    
    // CRITICAL FIX: Clear the message immediately regardless of embedded mode
    setMessage("");
    
    if (isEmbedded && window.self !== window.top && sendMessageToParent) {
      console.log('Using sendMessageToParent function');
      sendMessageToParent(text);
      return;
    }

    proceedWithMessage(text);
  };

  const handleSubmit = (e: React.FormEvent, sendMessageToParent?: (message: string) => void) => {
    e.preventDefault();
    if (!message.trim() || isWaitingForRateLimit) return;

    const messageToSend = message.trim();
    submitMessage(messageToSend, sendMessageToParent);
    
    if (isEmbedded) {
      e.stopPropagation();
    }
  };

  const handleSuggestedMessageClick = (text: string, sendMessageToParent?: (message: string) => void) => {
    submitMessage(text, sendMessageToParent);
    
    // Focus input field after suggested message click for all modes
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const copyMessageToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleFeedback = (timestamp: string, type: "like" | "dislike") => {
    setChatHistory(prev => 
      prev.map(msg => 
        msg.timestamp === timestamp 
          ? { ...msg, feedback: type } 
          : msg
      )
    );
  };

  const regenerateResponse = (allowRegenerate: boolean) => {
    if (!allowRegenerate) return;
    
    const lastUserMessageIndex = [...chatHistory].reverse().findIndex(msg => !msg.isAgent);
    if (lastUserMessageIndex === -1) return;
    
    const messagesToKeep = chatHistory.slice(0, chatHistory.length - lastUserMessageIndex);
    setChatHistory(messagesToKeep);
    
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setChatHistory(prev => [...prev, {
        isAgent: true,
        content: "Here's an alternative response to your question.",
        timestamp: new Date().toISOString()
      }]);
      
      // Focus input field after regenerate
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }, 1500);
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    
    // Focus input field after emoji insertion
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  return {
    message,
    setMessage,
    chatHistory,
    setChatHistory,
    isTyping,
    rateLimitError,
    setRateLimitError,
    timeUntilReset,
    setTimeUntilReset,
    isWaitingForRateLimit,
    setIsWaitingForRateLimit,
    userHasMessaged,
    inputRef,
    handleSubmit,
    handleSuggestedMessageClick,
    copyMessageToClipboard,
    handleFeedback,
    regenerateResponse,
    insertEmoji,
    proceedWithMessage
  };
};
