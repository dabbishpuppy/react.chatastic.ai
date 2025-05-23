
import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/use-toast";

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
          setTimeUntilReset(event.data.timeUntilReset || null);
          pendingMessageRef.current = null;
          
          // Show toast notification for rate limit
          toast({
            title: "Rate Limit Reached",
            description: event.data.message || 'Too many messages. Please wait and try again.',
            variant: "destructive",
          });
          
          if (event.data.timeUntilReset) {
            let currentTime = event.data.timeUntilReset;
            const interval = setInterval(() => {
              currentTime = currentTime - 1;
              if (currentTime <= 0) {
                clearInterval(interval);
                setRateLimitError(null);
                setTimeUntilReset(null);
              } else {
                setTimeUntilReset(currentTime);
              }
            }, 1000);
          }
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
      };
    }
  }, [isEmbedded, setIsWaitingForRateLimit, setRateLimitError, setTimeUntilReset, proceedWithMessage]);

  // Function to send message to parent and set up timeout
  const sendMessageToParent = (messageContent: string) => {
    console.log('sendMessageToParent called with:', messageContent);
    
    if (!isEmbedded || window.self === window.top) {
      // Not in iframe, proceed directly
      console.log('Not in iframe, proceeding directly');
      proceedWithMessage(messageContent);
      return;
    }

    // Show waiting state with placeholder
    setIsWaitingForRateLimit(true);
    setRateLimitError(null);
    
    console.log('Sending message to parent for rate limit check:', messageContent);
    
    // Store the message for fallback
    pendingMessageRef.current = messageContent;
    
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
