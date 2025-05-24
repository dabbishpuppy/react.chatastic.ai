
import { useEffect, useRef } from "react";
import { getAgentSecuritySettings } from "@/services/agentSecurityService";

export const useEmbeddedMode = (
  isEmbedded: boolean,
  message: string,
  setIsWaitingForRateLimit: (waiting: boolean) => void,
  setRateLimitError: (error: string | null) => void,
  setTimeUntilReset: (time: number | null) => void,
  proceedWithMessage: (message: string) => void
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessageRef = useRef<string | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Rate limiting functions (duplicated from useMessageHandling for iframe context)
  const getRateLimitKey = (agentId: string) => {
    return `wonderwave_rate_limit_${agentId}_timestamps`;
  };

  // Get rate limit start time key
  const getRateLimitStartTimeKey = (agentId: string) => {
    return `wonderwave_rate_limit_${agentId}_start_time`;
  };

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

  const saveMessageTimestamps = (agentId: string, timestamps: number[]) => {
    try {
      const key = getRateLimitKey(agentId);
      localStorage.setItem(key, JSON.stringify(timestamps));
    } catch (error) {
      console.error('Error saving rate limit timestamps:', error);
    }
  };

  // Get rate limit start time from localStorage
  const getRateLimitStartTime = (agentId: string) => {
    try {
      const key = getRateLimitStartTimeKey(agentId);
      const stored = localStorage.getItem(key);
      return stored ? parseInt(stored) : null;
    } catch (error) {
      console.error('Error reading rate limit start time:', error);
      return null;
    }
  };

  // Save rate limit start time to localStorage
  const saveRateLimitStartTime = (agentId: string, startTime: number) => {
    try {
      const key = getRateLimitStartTimeKey(agentId);
      localStorage.setItem(key, startTime.toString());
    } catch (error) {
      console.error('Error saving rate limit start time:', error);
    }
  };

  // Clear rate limit start time from localStorage
  const clearRateLimitStartTime = (agentId: string) => {
    try {
      const key = getRateLimitStartTimeKey(agentId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing rate limit start time:', error);
    }
  };

  const cleanOldTimestamps = (timestamps: number[], timeWindowSeconds: number) => {
    const now = Date.now();
    const timeWindowMs = timeWindowSeconds * 1000;
    
    return timestamps.filter(timestamp => {
      return (now - timestamp) < timeWindowMs;
    });
  };

  const startCountdown = (initialTime: number) => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    let currentTime = initialTime;
    setTimeUntilReset(currentTime);

    countdownIntervalRef.current = setInterval(() => {
      currentTime = currentTime - 1;
      if (currentTime <= 0) {
        clearInterval(countdownIntervalRef.current!);
        setRateLimitError(null);
        setTimeUntilReset(null);
        countdownIntervalRef.current = null;
      } else {
        setTimeUntilReset(currentTime);
      }
    }, 1000);
  };

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
        // Check if we already have a start time
        const existingStartTime = getRateLimitStartTime(agentId);
        const now = Date.now();
        
        if (existingStartTime) {
          // Calculate remaining time from existing start time
          const elapsedSeconds = Math.floor((now - existingStartTime) / 1000);
          timeUntilReset = Math.max(0, rate_limit_time_window - elapsedSeconds);
          
          if (timeUntilReset <= 0) {
            // Time window has expired, clear start time
            clearRateLimitStartTime(agentId);
            timeUntilReset = null;
          } else {
            resetTime = new Date(existingStartTime + (rate_limit_time_window * 1000));
          }
        } else {
          // First time hitting rate limit, set start time
          saveRateLimitStartTime(agentId, now);
          timeUntilReset = rate_limit_time_window;
          resetTime = new Date(now + (rate_limit_time_window * 1000));
        }
      } else {
        // Not exceeded, clear any existing start time
        clearRateLimitStartTime(agentId);
      }
      
      // Save cleaned timestamps
      saveMessageTimestamps(agentId, timestamps);
      
      return {
        exceeded: timeUntilReset && timeUntilReset > 0,
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

  useEffect(() => {
    if (isEmbedded && window.self !== window.top) {
      const handleMessage = (event: MessageEvent) => {
        console.log('Received message from parent:', event.data);
        
        if (event.data?.type === 'message-allowed') {
          console.log('Message allowed by parent');
          
          // Clear timeout since parent responded
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          setIsWaitingForRateLimit(false);
          setRateLimitError(null);
          
          const messageToProcess = event.data.originalMessage?.content || pendingMessageRef.current;
          if (messageToProcess) {
            proceedWithMessage(messageToProcess);
          }
          pendingMessageRef.current = null;
        } else if (event.data?.type === 'rate-limit-error') {
          console.log('Rate limit error from parent:', event.data);
          
          // Clear timeout since parent responded
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          setIsWaitingForRateLimit(false);
          setRateLimitError(event.data.message || 'Too many messages. Please wait.');
          
          if (event.data.timeUntilReset) {
            startCountdown(event.data.timeUntilReset);
          }
          
          pendingMessageRef.current = null;
        }
      };

      window.addEventListener('message', handleMessage);
      
      return () => {
        window.removeEventListener('message', handleMessage);
        // Clean up timeout on unmount
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        // Clean up countdown on unmount
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      };
    }
  }, [isEmbedded, setIsWaitingForRateLimit, setRateLimitError, setTimeUntilReset, proceedWithMessage]);

  // Function to send message to parent and set up timeout with local rate limiting
  const sendMessageToParent = async (messageContent: string, agentId?: string) => {
    console.log('sendMessageToParent called with:', messageContent);
    
    if (!isEmbedded || window.self === window.top) {
      // Not in iframe, check rate limit locally and proceed
      console.log('Not in iframe, checking rate limit locally');
      
      if (agentId) {
        const rateLimitStatus = await checkRateLimit(agentId);
        
        if (rateLimitStatus.exceeded) {
          console.log('Rate limit exceeded locally');
          setRateLimitError(rateLimitStatus.message || 'Too many messages in a row');
          if (rateLimitStatus.timeUntilReset) {
            startCountdown(rateLimitStatus.timeUntilReset);
          }
          return;
        }
        
        // Record the message
        await recordMessage(agentId);
      }
      
      proceedWithMessage(messageContent);
      return;
    }

    console.log('Sending message to parent for rate limit check:', messageContent);
    
    // Store the message for fallback
    pendingMessageRef.current = messageContent;
    
    // Set waiting state
    setIsWaitingForRateLimit(true);
    setRateLimitError(null);
    
    // Send message to parent
    window.parent.postMessage({
      type: 'send-message',
      content: messageContent,
      timestamp: new Date().toISOString()
    }, '*');
    
    // Set up timeout fallback - if parent doesn't respond in 3 seconds, proceed anyway
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      console.log('Parent window did not respond to rate limit check within 3 seconds, proceeding with message');
      setIsWaitingForRateLimit(false);
      setRateLimitError(null);
      
      if (pendingMessageRef.current) {
        proceedWithMessage(pendingMessageRef.current);
        pendingMessageRef.current = null;
      }
      timeoutRef.current = null;
    }, 3000);
  };

  return { sendMessageToParent };
};
