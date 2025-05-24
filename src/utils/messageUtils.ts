
import { ChatMessage } from "@/types/chatInterface";

export const proceedWithMessage = (
  text: string,
  setChatHistory: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void,
  setUserHasMessaged: (value: boolean) => void,
  setIsTyping: (value: boolean) => void,
  inputRef: React.RefObject<HTMLInputElement>,
  isEmbedded: boolean
) => {
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

export const copyMessageToClipboard = (content: string) => {
  navigator.clipboard.writeText(content);
};

export const handleFeedback = (
  timestamp: string, 
  type: "like" | "dislike",
  setChatHistory: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void
) => {
  setChatHistory(prev => 
    prev.map(msg => 
      msg.timestamp === timestamp 
        ? { ...msg, feedback: type } 
        : msg
    )
  );
};

export const regenerateResponse = (
  allowRegenerate: boolean,
  chatHistory: ChatMessage[],
  isTyping: boolean,
  setChatHistory: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void,
  setIsTyping: (value: boolean) => void,
  inputRef: React.RefObject<HTMLInputElement>
) => {
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

export const insertEmoji = (
  emoji: string,
  isTyping: boolean,
  rateLimitError: string | null,
  setMessage: (updater: (prev: string) => string) => void,
  inputRef: React.RefObject<HTMLInputElement>
) => {
  if (isTyping || rateLimitError) return;
  
  setMessage(prev => prev + emoji);
  
  // Focus input field after emoji insertion
  setTimeout(() => {
    inputRef.current?.focus();
  }, 10);
};
