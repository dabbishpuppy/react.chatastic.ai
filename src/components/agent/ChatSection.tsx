
import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types/chatInterface";
import ChatHeader from "./chat/ChatHeader";
import ChatMessageComponent from "./chat/ChatMessage";
import ChatInput from "./chat/ChatInput";
import LoadingDots from "./chat/LoadingDots";
import RateLimitError from "./chat/RateLimitError";
import SuggestedMessages from "./chat/SuggestedMessages";

interface ChatSectionProps {
  initialMessages?: ChatMessage[];
  toggleSettings?: () => void;
  agentName?: string;
  placeholder?: string;
  suggestedMessages?: string[];
  showSuggestions?: boolean;
  showFeedback?: boolean;
  allowRegenerate?: boolean;
  theme?: 'light' | 'dark' | 'system';
  profilePicture?: string;
  chatIcon?: string;
  footer?: string | null;
  footerClassName?: string;
  isEmbedded?: boolean;
  userMessageColor?: string | null;
  headerColor?: string | null;
  hideUserAvatar?: boolean;
}

// Helper function to determine contrasting text color for a background
function getContrastColor(hex: string): string {
  let r = 0, g = 0, b = 0;
  
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

const ChatSection: React.FC<ChatSectionProps> = ({ 
  initialMessages = [], 
  toggleSettings,
  agentName = "AI Customer Service",
  placeholder = "Write message here...",
  suggestedMessages = [],
  showSuggestions = true,
  showFeedback = true,
  allowRegenerate = true,
  theme = 'light',
  profilePicture,
  chatIcon,
  footer,
  footerClassName = "",
  isEmbedded = false,
  userMessageColor = null,
  headerColor = null,
  hideUserAvatar = false,
}) => {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userHasMessaged, setUserHasMessaged] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Use a smoother scroll for embedded content to prevent parent page scrolling
    if (isEmbedded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      
      // Notify parent window about new content height
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

  // Update chat when initialMessages prop changes
  useEffect(() => {
    if (initialMessages.length > 0) {
      setChatHistory(initialMessages);
    }
  }, [initialMessages]);

  // Prevent scrolling outside iframe when focusing input
  useEffect(() => {
    if (isEmbedded && inputRef.current) {
      const handleFocus = (e: FocusEvent) => {
        e.preventDefault();
        // Ensure the page doesn't scroll when input is focused
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo(0, chatContainerRef.current.scrollHeight);
        }
      };

      const input = inputRef.current;
      input.addEventListener('focus', handleFocus);
      
      return () => {
        input.removeEventListener('focus', handleFocus);
      };
    }
  }, [isEmbedded]);

  // Listen for messages from parent window (rate limiting responses)
  useEffect(() => {
    if (isEmbedded && window.self !== window.top) {
      const handleMessage = (event: MessageEvent) => {
        console.log('Received message from parent:', event.data);
        
        if (event.data?.type === 'message-allowed') {
          console.log('Message allowed by parent');
          setIsWaitingForRateLimit(false);
          setRateLimitError(null);
          // Proceed with sending the message
          proceedWithMessage(event.data.originalMessage?.content || message);
        } else if (event.data?.type === 'rate-limit-error') {
          console.log('Rate limit error from parent:', event.data);
          setIsWaitingForRateLimit(false);
          setRateLimitError(event.data.message || 'Too many messages. Please wait.');
          setTimeUntilReset(event.data.timeUntilReset || null);
          
          // Start countdown timer
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
  }, [isEmbedded, message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isWaitingForRateLimit) return;

    submitMessage(message);
    
    // Prevent any potential scrolling of the parent page
    if (isEmbedded) {
      e.stopPropagation();
    }
  };

  const submitMessage = (text: string) => {
    console.log('Submitting message:', text, 'isEmbedded:', isEmbedded);
    
    // If embedded, ask parent window for rate limit check
    if (isEmbedded && window.self !== window.top) {
      console.log('Sending message to parent for rate limit check');
      setIsWaitingForRateLimit(true);
      window.parent.postMessage({
        type: 'send-message',
        content: text,
        timestamp: new Date().toISOString()
      }, '*');
      return;
    }

    // Non-embedded flow - proceed directly
    proceedWithMessage(text);
  };

  const proceedWithMessage = (text: string) => {
    console.log('Proceeding with message:', text);
    
    // Add user message to chat history
    setChatHistory(prev => [...prev, {
      isAgent: false,
      content: text,
      timestamp: new Date().toISOString()
    }]);
    
    // Clear message input
    setMessage("");

    // Mark that user has sent a message
    setUserHasMessaged(true);
    
    // Show typing animation
    setIsTyping(true);
    
    // Simulate agent response (would be replaced with actual API call)
    setTimeout(() => {
      setIsTyping(false);
      setChatHistory(prev => [...prev, {
        isAgent: true,
        content: "I'm here to help you with any questions or tasks!",
        timestamp: new Date().toISOString()
      }]);
      
      // Trigger a resize message when receiving a response
      if (isEmbedded && window.self !== window.top) {
        setTimeout(() => {
          window.parent.postMessage({ type: 'message-sent' }, '*');
        }, 100);
      }
    }, 1500);
  };

  const handleSuggestedMessageClick = (text: string) => {
    submitMessage(text);
    
    // Prevent scrolling of parent page when clicking suggestions
    if (isEmbedded) {
      // Keep focus within the iframe
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const copyMessageToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  };

  const handleFeedback = (timestamp: string, type: "like" | "dislike") => {
    setChatHistory(prev => 
      prev.map(msg => 
        msg.timestamp === timestamp 
          ? { ...msg, feedback: type } 
          : msg
      )
    );
    // In a real implementation, you would send this feedback to your backend
  };

  const regenerateResponse = () => {
    if (!allowRegenerate) return;
    
    // Find the last user message
    const lastUserMessageIndex = [...chatHistory].reverse().findIndex(msg => !msg.isAgent);
    if (lastUserMessageIndex === -1) return;
    
    // Remove messages after the last user message
    const messagesToKeep = chatHistory.slice(0, chatHistory.length - lastUserMessageIndex);
    setChatHistory(messagesToKeep);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Simulate agent response
    setTimeout(() => {
      setIsTyping(false);
      setChatHistory(prev => [...prev, {
        isAgent: true,
        content: "Here's an alternative response to your question.",
        timestamp: new Date().toISOString()
      }]);
    }, 1500);
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  // Apply theme based on settings
  const themeClasses = {
    agentBubble: theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-gray-100',
    userBubble: theme === 'dark' ? 'bg-blue-900 text-white' : 'bg-primary text-primary-foreground',
    background: theme === 'dark' ? 'bg-gray-900' : 'bg-white',
    text: theme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    inputBg: theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    inputText: theme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    iconButton: theme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-800',
    footerBg: theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-t text-gray-500',
  };

  // Should we show suggested messages?
  const shouldShowSuggestions = suggestedMessages.length > 0 && (!userHasMessaged || showSuggestions);

  // User message style with custom color
  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  // Determine container classes based on whether this is embedded or not
  const containerClasses = isEmbedded 
    ? `flex flex-col h-screen w-full ${themeClasses.background} overflow-hidden`
    : `flex flex-col h-full max-w-[800px] mx-auto ${themeClasses.background}`;

  return (
    <div className={containerClasses} ref={chatContainerRef}>
      {/* Chat Header */}
      <ChatHeader
        agentName={agentName}
        profilePicture={profilePicture}
        allowRegenerate={allowRegenerate}
        toggleSettings={toggleSettings}
        onRegenerate={regenerateResponse}
        headerColor={headerColor}
        backgroundColor={themeClasses.background}
        iconButtonClass={themeClasses.iconButton}
      />

      {/* Chat Messages - Scrollable area */}
      <div className={`flex-1 overflow-y-auto p-6 ${themeClasses.background} scroll-container`}>
        {chatHistory.map((msg, idx) => (
          <ChatMessageComponent
            key={idx}
            message={msg}
            agentName={agentName}
            profilePicture={profilePicture}
            showFeedback={showFeedback}
            hideUserAvatar={hideUserAvatar}
            onFeedback={handleFeedback}
            onCopy={copyMessageToClipboard}
            agentBubbleClass={themeClasses.agentBubble}
            userBubbleClass={themeClasses.userBubble}
            userMessageStyle={userMessageStyle}
          />
        ))}
        
        {/* Loading indicator */}
        {isTyping && (
          <div className="flex mb-4">
            <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
              {profilePicture ? (
                <AvatarImage src={profilePicture} alt={agentName} />
              ) : (
                <AvatarFallback className="bg-gray-200 text-gray-600">
                  {agentName.charAt(0)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className={`rounded-lg p-3 max-w-[80%] ${themeClasses.agentBubble}`}>
              <LoadingDots />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed footer section with rate limit error, suggestions, and input */}
      <div className={`flex-shrink-0 ${themeClasses.background}`}>
        {/* Rate limit error message */}
        {rateLimitError && (
          <RateLimitError 
            message={rateLimitError} 
            timeUntilReset={timeUntilReset} 
          />
        )}

        {/* Suggested Messages */}
        {shouldShowSuggestions && suggestedMessages.length > 0 && (
          <SuggestedMessages
            messages={suggestedMessages}
            onMessageClick={handleSuggestedMessageClick}
            isWaitingForRateLimit={isWaitingForRateLimit}
            theme={theme}
            backgroundColor={themeClasses.background}
          />
        )}

        {/* Chat Input */}
        <ChatInput
          message={message}
          setMessage={setMessage}
          onSubmit={handleSubmit}
          isWaitingForRateLimit={isWaitingForRateLimit}
          placeholder={placeholder}
          inputRef={inputRef}
          chatIcon={chatIcon}
          isEmbedded={isEmbedded}
          footer={footer}
          footerClassName={footerClassName}
          theme={theme}
          inputBackgroundClass={themeClasses.inputBg}
          inputTextClass={themeClasses.inputText}
          iconButtonClass={themeClasses.iconButton}
          textClass={themeClasses.text}
          onEmojiInsert={insertEmoji}
        />
      </div>
    </div>
  );
};

export default ChatSection;
