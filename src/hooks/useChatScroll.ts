
import { useRef, useEffect } from "react";

export const useChatScroll = (isEmbedded: boolean, chatHistory: any[], isTyping: boolean) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (isEmbedded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      
      if (window.self !== window.top) {
        window.parent.postMessage({ 
          type: 'message-sent'
        }, '*');
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (isEmbedded && messagesEndRef.current) {
      const handleFocus = (e: FocusEvent) => {
        e.preventDefault();
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo(0, chatContainerRef.current.scrollHeight);
        }
      };

      const input = messagesEndRef.current;
      input.addEventListener('focus', handleFocus);
      
      return () => {
        input.removeEventListener('focus', handleFocus);
      };
    }
  }, [isEmbedded]);

  return {
    messagesEndRef,
    chatContainerRef,
    scrollToBottom
  };
};
