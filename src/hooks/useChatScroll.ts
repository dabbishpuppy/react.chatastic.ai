
import { useRef, useEffect } from "react";

export const useChatScroll = (isEmbedded: boolean, chatHistory: any[], isTyping: boolean) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (forceSmooth = false) => {
    if (isEmbedded && messagesEndRef.current) {
      // Enhanced scrolling for embedded mode with better visibility
      messagesEndRef.current.scrollIntoView({ 
        behavior: forceSmooth ? "smooth" : "auto", 
        block: "end",
        inline: "nearest"
      });
      
      if (window.self !== window.top) {
        window.parent.postMessage({ 
          type: 'message-sent'
        }, '*');
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Enhanced scroll trigger for lead forms
  useEffect(() => {
    const hasLeadForm = chatHistory.some(msg => msg.content === "LEAD_FORM_WIDGET");
    
    if (hasLeadForm) {
      // Delay scroll for lead form to ensure DOM is fully rendered
      setTimeout(() => {
        scrollToBottom(true);
      }, 300);
    } else {
      scrollToBottom();
    }
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
