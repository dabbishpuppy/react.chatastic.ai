
import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RefreshCw, SendIcon, Settings, Copy, ThumbsUp, ThumbsDown, Smile } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChatMessage } from "@/types/chatInterface";

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

// Emoji list for the emoji picker
const emojis = ["😊", "👍", "👋", "🙏", "❤️", "🎉", "🔥", "✨", "🤔", "😂", "🚀", "👏", "🌟", "💡", "👀", "💪", "🙌", "👌", "💯", "🎯"];

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

  // Add timeout mechanism for rate limit check
  useEffect(() => {
    if (isWaitingForRateLimit) {
      console.log('Setting timeout for rate limit check');
      const timeout = setTimeout(() => {
        console.log('Rate limit timeout - proceeding with message');
        setIsWaitingForRateLimit(false);
        setRateLimitError(null);
        // If no response from parent after 5 seconds, proceed with message
        proceedWithMessage(message);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [isWaitingForRateLimit, message]);

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

  // Loading animation dots
  const LoadingDots = () => (
    <div className="flex space-x-1 items-center">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "0ms"}}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "300ms"}}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "600ms"}}></div>
    </div>
  );

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
      <div 
        className={`p-4 border-b flex items-center justify-between flex-shrink-0 ${themeClasses.background}`}
        style={headerColor ? { backgroundColor: headerColor, color: getContrastColor(headerColor) } : {}}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10 border-0">
            {profilePicture ? (
              <AvatarImage src={profilePicture} alt={agentName} />
            ) : (
              <AvatarFallback className="bg-gray-200 text-gray-600">
                {agentName.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>
          <span className={headerColor ? "" : `font-medium ${themeClasses.text}`}>{agentName}</span>
        </div>
        <div className="flex items-center gap-2">
          {allowRegenerate && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={headerColor ? "text-inherit hover:bg-white/20" : `h-9 w-9 ${themeClasses.iconButton}`} 
              onClick={regenerateResponse}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          )}
          {toggleSettings && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={headerColor ? "text-inherit hover:bg-white/20" : `h-9 w-9 ${themeClasses.iconButton}`}
              onClick={toggleSettings}
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Chat Messages - Scrollable area */}
      <div className={`flex-1 overflow-y-auto p-6 ${themeClasses.background} scroll-container`}>
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex mb-4 ${msg.isAgent ? '' : 'justify-end'}`}>
            {msg.isAgent && (
              <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
                {profilePicture ? (
                  <AvatarImage src={profilePicture} alt={agentName} />
                ) : (
                  <AvatarFallback className="bg-gray-200 text-gray-600">
                    {agentName.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
            )}
            <div className="flex flex-col max-w-[80%]">
              <div 
                className={`rounded-lg p-3 text-[0.875rem] ${
                  msg.isAgent ? themeClasses.agentBubble : themeClasses.userBubble
                }`}
                style={msg.isAgent ? {} : userMessageStyle}
              >
                {msg.content}
              </div>
              
              {/* Message actions for agent messages */}
              {msg.isAgent && showFeedback && (
                <div className="flex mt-1 space-x-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleFeedback(msg.timestamp, "like")}
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 rounded-full ${msg.feedback === "like" ? "bg-green-100" : ""}`}
                        >
                          <ThumbsUp size={14} className={msg.feedback === "like" ? "text-green-600" : "text-gray-500"} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Like</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleFeedback(msg.timestamp, "dislike")}
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 rounded-full ${msg.feedback === "dislike" ? "bg-red-100" : ""}`}
                        >
                          <ThumbsDown size={14} className={msg.feedback === "dislike" ? "text-red-600" : "text-gray-500"} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Dislike</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => copyMessageToClipboard(msg.content)}
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                        >
                          <Copy size={14} className="text-gray-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            
            {!msg.isAgent && !hideUserAvatar && (
              <Avatar className="h-8 w-8 ml-2 mt-1 border-0">
                <AvatarFallback className="bg-gray-200 text-gray-600">U</AvatarFallback>
              </Avatar>
            )}
          </div>
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

        {/* Rate limit error message */}
        {rateLimitError && (
          <div className="flex mb-4">
            <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
              {profilePicture ? (
                <AvatarImage src={profilePicture} alt={agentName} />
              ) : (
                <AvatarFallback className="bg-red-100 text-red-600">!</AvatarFallback>
              )}
            </Avatar>
            <div className="rounded-lg p-3 max-w-[80%] bg-red-50 border border-red-200">
              <p className="text-red-700 text-sm">{rateLimitError}</p>
              {timeUntilReset && (
                <p className="text-red-600 text-xs mt-1">
                  Try again in {timeUntilReset} seconds
                </p>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed footer section with suggestions and input */}
      <div className={`flex-shrink-0 ${themeClasses.background}`}>
        {/* Suggested Messages */}
        {shouldShowSuggestions && suggestedMessages.length > 0 && (
          <div className={`p-4 border-t ${themeClasses.background}`}>
            <div className="flex flex-wrap gap-2">
              {suggestedMessages.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className={`rounded-full text-sm ${theme === 'dark' ? 'border-gray-700 text-gray-300' : ''}`}
                  onClick={() => handleSuggestedMessageClick(suggestion)}
                  disabled={isWaitingForRateLimit}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input */}
        <div className={`border-t p-4 ${themeClasses.background}`}>
          <form onSubmit={handleSubmit} className="flex items-center w-full relative">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={`absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 z-10 ${themeClasses.iconButton}`}
                  disabled={isWaitingForRateLimit}
                  type="button"
                >
                  <Smile size={18} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className={`w-64 p-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}`}>
                <div className="grid grid-cols-5 gap-2">
                  {emojis.map((emoji, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className={`h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      onClick={() => insertEmoji(emoji)}
                      disabled={isWaitingForRateLimit}
                      type="button"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isWaitingForRateLimit ? "Checking rate limit..." : placeholder}
              className={`w-full border rounded-full px-4 py-3 pr-12 pl-10 focus:outline-none focus:ring-1 focus:ring-primary ${themeClasses.inputBg} ${themeClasses.inputText}`}
              disabled={isWaitingForRateLimit}
            />
            <Button 
              type="submit" 
              size="sm" 
              variant="ghost"
              className={`absolute right-1 rounded-full h-8 w-8 ${themeClasses.iconButton}`}
              disabled={!message.trim() || isWaitingForRateLimit}
            >
              <SendIcon size={16} />
            </Button>
          </form>
          
          {/* Chat Icon - Only show when not in embedded mode */}
          {chatIcon && !isEmbedded && (
            <div className="flex justify-end mt-3">
              <Avatar className="h-10 w-10 border-0">
                <AvatarImage src={chatIcon} alt="Chat Icon" />
                <AvatarFallback>💬</AvatarFallback>
              </Avatar>
            </div>
          )}
          
          {/* Footer */}
          {footer && (
            <div className={`mt-3 text-xs text-center ${themeClasses.text} ${footerClassName}`}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to determine contrasting text color for a background
function getContrastColor(hex: string): string {
  // Convert hex to RGB
  let r = 0, g = 0, b = 0;
  
  if (hex.length === 4) {
    // #RGB format
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    // #RRGGBB format
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white or black based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export default ChatSection;
