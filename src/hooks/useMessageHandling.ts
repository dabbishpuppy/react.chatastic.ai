
import { useState, useRef } from "react";
import { ChatMessage } from "@/types/chatInterface";
import { getAgentSecuritySettings } from "@/services/agentSecurityService";

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
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get rate limit storage key for an agent
  const getRateLimitKey = (agentId: string) => {
    return `wonderwave_rate_limit_${agentId}_timestamps`;
  };

  // Get message timestamps from localStorage
  const getMessageTimestamps = (agentId: string) => {
    try {
      const key = getRateLimitKey(agentId);
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      
      const timestamps = JSON.parse(stored);
      return Array.isArray(timestamps) ? timestamps : [];
    } catch (error) {
      console.error('Error reading rate limit timestamps:', error);
      return [];
    }
  };

  // Save message timestamps to localStorage
  const saveMessageTimestamps = (agentId: string, timestamps: number[]) => {
    try {
      const key = getRateLimitKey(agentId);
      localStorage.setItem(key, JSON.stringify(timestamps));
    } catch (error) {
      console.error('Error saving rate limit timestamps:', error);
    }
  };

  // Clean old timestamps outside the time window
  const cleanOldTimestamps = (timestamps: number[], timeWindowSeconds: number) => {
    const now = Date.now();
    const timeWindowMs = timeWindowSeconds * 1000;
    
    return timestamps.filter(timestamp => {
      return (now - timestamp) < timeWindowMs;
    });
  };

  // Check if rate limit is exceeded
  const checkRateLimit = async (agentId: string) => {
    try {
      const settings = await getAgentSecuritySettings(agentId);
      
      if (!settings || !settings.rate_limit_enabled) {
        return { exceeded: false, remaining: null, resetTime: null };
      }

      const { rate_limit_messages, rate_limit_time_window, rate_limit_message } = settings;
      
      // Get current timestamps
      let timestamps = getMessageTimestamps(agentId);
      
      // Clean old timestamps
      timestamps = cleanOldTimestamps(timestamps, rate_limit_time_window);
      
      // Check if limit is exceeded
      const exceeded = timestamps.length >= rate_limit_messages;
      
      // Calculate reset time and timeUntilReset
      let resetTime = null;
      let timeUntilReset = null;
      if (exceeded) {
        // When rate limit is exceeded, show the full time window
        timeUntilReset = rate_limit_time_window;
        resetTime = new Date(Date.now() + (rate_limit_time_window * 1000));
      }
      
      // Save cleaned timestamps
      saveMessageTimestamps(agentId, timestamps);
      
      return {
        exceeded,
        resetTime,
        timeUntilReset,
        message: rate_limit_message || 'Too many messages in a row',
        current: timestamps.length,
        limit: rate_limit_messages,
        timeWindow: rate_limit_time_window
      };
      
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // On error, allow the message (fail open)
      return { exceeded: false, remaining: null, resetTime: null };
    }
  };

  // Record a new message timestamp
  const recordMessage = async (agentId: string) => {
    try {
      const settings = await getAgentSecuritySettings(agentId);
      
      if (!settings || !settings.rate_limit_enabled) {
        return;
      }
      
      // Get current timestamps
      let timestamps = getMessageTimestamps(agentId);
      
      // Clean old timestamps
      timestamps = cleanOldTimestamps(timestamps, settings.rate_limit_time_window);
      
      // Add new timestamp
      timestamps.push(Date.now());
      
      // Save updated timestamps
      saveMessageTimestamps(agentId, timestamps);
      
    } catch (error) {
      console.error('Error recording message timestamp:', error);
    }
  };

  // Handle countdown finish - clear rate limit error
  const handleCountdownFinished = () => {
    setRateLimitError(null);
    setTimeUntilReset(null);
    
    // Focus input field when rate limit is cleared
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const proceedWithMessage = (text: string) => {
    console.log('Proceeding with message:', text);
    
    setChatHistory(prev => [...prev, {
      isAgent: false,
      content: text,
      timestamp: new Date().toISOString()
    }]);
    
    setUserHasMessaged(true);
    setIsTyping(true);
    
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

  // Enhanced message submission with rate limiting
  const submitMessage = async (text: string, agentId?: string) => {
    console.log('Submitting message:', text);
    
    // Clear input immediately
    setMessage("");
    
    // Check rate limit if agentId is provided
    if (agentId) {
      const rateLimitStatus = await checkRateLimit(agentId);
      
      if (rateLimitStatus.exceeded) {
        console.log('Rate limit exceeded');
        setRateLimitError(rateLimitStatus.message || 'Too many messages in a row');
        if (rateLimitStatus.timeUntilReset) {
          setTimeUntilReset(rateLimitStatus.timeUntilReset);
        }
        return;
      }
      
      // Record the message
      await recordMessage(agentId);
    }
    
    // Add message to chat and proceed
    proceedWithMessage(text);
  };

  const handleSubmit = async (e: React.FormEvent, agentId?: string) => {
    e.preventDefault();
    if (!message.trim() || isTyping || rateLimitError) return;

    const messageToSend = message.trim();
    await submitMessage(messageToSend, agentId);
    
    if (isEmbedded) {
      e.stopPropagation();
    }
  };

  const handleSuggestedMessageClick = async (text: string, agentId?: string) => {
    if (isTyping || rateLimitError) return;
    
    await submitMessage(text, agentId);
    
    // Focus input field after suggested message click
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
    if (!allowRegenerate || isTyping) return;
    
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
    if (isTyping || rateLimitError) return;
    
    setMessage(prev => prev + emoji);
    
    // Focus input field after emoji insertion
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  // Cleanup countdown on unmount
  const cleanup = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
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
    proceedWithMessage,
    submitMessage,
    handleCountdownFinished,
    cleanup
  };
};
