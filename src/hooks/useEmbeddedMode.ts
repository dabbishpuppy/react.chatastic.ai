
import { useEffect } from "react";

export const useEmbeddedMode = (
  isEmbedded: boolean,
  message: string,
  setIsWaitingForRateLimit: (waiting: boolean) => void,
  setRateLimitError: (error: string | null) => void,
  setTimeUntilReset: (time: number | null) => void,
  proceedWithMessage: (message: string) => void
) => {
  useEffect(() => {
    if (isEmbedded && window.self !== window.top) {
      const handleMessage = (event: MessageEvent) => {
        console.log('Received message from parent:', event.data);
        
        if (event.data?.type === 'message-allowed') {
          console.log('Message allowed by parent');
          setIsWaitingForRateLimit(false);
          setRateLimitError(null);
          proceedWithMessage(event.data.originalMessage?.content || message);
        } else if (event.data?.type === 'rate-limit-error') {
          console.log('Rate limit error from parent:', event.data);
          setIsWaitingForRateLimit(false);
          setRateLimitError(event.data.message || 'Too many messages. Please wait.');
          setTimeUntilReset(event.data.timeUntilReset || null);
          
          if (event.data.timeUntilReset) {
            const interval = setInterval(() => {
              setTimeUntilReset(prev => {
                if (prev === null || prev <= 1) {
                  clearInterval(interval);
                  setRateLimitError(null);
                  return null;
                }
                return prev - 1;
              });
            }, 1000);
          }
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isEmbedded, message, setIsWaitingForRateLimit, setRateLimitError, setTimeUntilReset, proceedWithMessage]);
};
