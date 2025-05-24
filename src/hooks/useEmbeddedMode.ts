
import { useEffect, useRef } from "react";
import { checkRateLimit, recordMessage } from "@/utils/rateLimitUtils";

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
