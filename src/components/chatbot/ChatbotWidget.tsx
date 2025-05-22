
import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ChevronDown, Copy, RefreshCw, ThumbsUp, ThumbsDown, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Types for our chat messages
interface ChatMessage {
  id: string;
  content: string;
  sender: "bot" | "user";
  timestamp: Date;
  isLoading?: boolean;
  feedback?: "like" | "dislike" | null;
}

// Props for the ChatbotWidget component
interface ChatbotWidgetProps {
  productName?: string;
  botName?: string;
  botAvatar?: string;
  userAvatar?: string;
  primaryColor?: string;
  showPopups?: boolean;
  theme?: 'light' | 'dark' | 'system';
  bubblePosition?: 'left' | 'right';
  autoShowDelay?: number;
  showFeedback?: boolean;
  allowRegenerate?: boolean;
  initialMessage?: string;
  suggestedMessages?: string[];
  showSuggestions?: boolean;
  messagePlaceholder?: string;
  footer?: string | null;
  chatIcon?: string | null;
  profilePicture?: string | null;
  userMessageColor?: string | null;
}

// Emoji list for the emoji picker
const emojis = ["😊", "👍", "👋", "🙏", "❤️", "🎉", "🔥", "✨", "🤔", "😂", "🚀", "👏", "🌟", "💡", "👀", "💪", "🙌", "👌", "💯", "🎯"];

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  productName = "Chatbase",
  botName = "Chatbase AI",
  botAvatar = "/placeholder.svg",
  userAvatar,
  primaryColor = "#000000",
  showPopups = true,
  theme = 'light',
  bubblePosition = 'right',
  autoShowDelay = 1,
  showFeedback = true,
  allowRegenerate = true,
  initialMessage = "👋 Hi! I am an AI chatbot, ask me anything!",
  suggestedMessages = [],
  showSuggestions = true,
  messagePlaceholder = "Message...",
  footer,
  chatIcon,
  profilePicture,
  userMessageColor,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initial message popups state
  const [popupMessages] = useState<string[]>(initialMessage.split('\n').filter(Boolean));
  const [visiblePopups, setVisiblePopups] = useState<number[]>([]);
  
  // Set initial welcome messages when component mounts
  useEffect(() => {
    // Only set initial messages once
    if (messages.length === 0) {
      const initialMessages = initialMessage.split('\n').filter(Boolean).map((content, index) => ({
        id: `welcome-${index}`,
        content,
        sender: "bot" as const,
        timestamp: new Date(Date.now() + index * 1000),
      }));
      
      // Add a user message "Hello, World!"
      const userMessage = {
        id: `user-hello`,
        content: "Hello, World!",
        sender: "user" as const,
        timestamp: new Date(Date.now() + (initialMessages.length + 1) * 1000),
      };
      
      setMessages([...initialMessages, userMessage]);
    }
  }, [initialMessage]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show popups when chat is closed
  useEffect(() => {
    if (!isOpen && showPopups) {
      // Only show popups if autoShowDelay is positive
      if (autoShowDelay <= 0) return;
      
      // Reset visible popups when chat closes
      setVisiblePopups([]);
      
      // Get message list for popups
      const popupList = popupMessages.length > 0 ? popupMessages : ["👋 Hi! I am an AI assistant!"];
      
      // Show first popup after configured delay
      const firstPopupTimeout = setTimeout(() => {
        setVisiblePopups([0]);
        
        // Show additional popups with sequential delays if available
        if (popupList.length > 1) {
          const subsequentTimeouts: NodeJS.Timeout[] = [];
          
          for (let i = 1; i < popupList.length; i++) {
            const timeout = setTimeout(() => {
              setVisiblePopups(prev => [...prev, i]);
            }, i * 2000); // Show each subsequent popup after 2 seconds
            
            subsequentTimeouts.push(timeout);
          }
          
          return () => subsequentTimeouts.forEach(timeout => clearTimeout(timeout));
        }
      }, autoShowDelay * 1000); // Convert to milliseconds
      
      return () => clearTimeout(firstPopupTimeout);
    } else {
      // Hide popups when chat is open
      setVisiblePopups([]);
    }
  }, [isOpen, showPopups, autoShowDelay, popupMessages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setMessage("");
    
    // Show typing indicator
    setIsTyping(true);

    // Simulate bot response after a delay
    setTimeout(() => {
      setIsTyping(false);
      
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm a demo chatbot. This is a static reply to your message. In a real implementation, this would be connected to an LLM API.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    }, 2000);
  };

  const copyMessageToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  };

  const retryLastMessage = () => {
    if (!allowRegenerate) return;
    
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.sender === "user");
    if (lastUserMessageIndex === -1) return;
    
    const lastUserMessage = [...messages].reverse()[lastUserMessageIndex];
    
    // Remove messages after the last user message
    const messagesToKeep = messages.slice(0, messages.length - lastUserMessageIndex);
    setMessages(messagesToKeep);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Simulate bot response
    setTimeout(() => {
      setIsTyping(false);
      const botResponse: ChatMessage = {
        id: Date.now().toString(),
        content: "This is a new response after retrying your question. In a real implementation, this would be a new generation from the LLM.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    }, 2000);
  };

  const handleFeedback = (messageId: string, type: "like" | "dislike") => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, feedback: type } 
          : msg
      )
    );
    // In a real implementation, you would send this feedback to your backend
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleSuggestedMessageClick = (text: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: text,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    
    // Show typing indicator
    setIsTyping(true);

    // Simulate bot response after a delay
    setTimeout(() => {
      setIsTyping(false);
      
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "This is a response to your suggested message selection. In a real implementation, this would be connected to an LLM API.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    }, 2000);
  };

  // Apply theme based on settings
  const themeClasses = {
    background: theme === 'dark' ? 'bg-gray-900' : 'bg-white',
    header: theme === 'dark' ? 'bg-gray-800 text-white' : '',
    text: theme === 'dark' ? 'text-white' : 'text-gray-800',
    inputBg: theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    botBubble: theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border border-gray-200',
    userBubble: theme === 'dark' ? 'bg-blue-900 text-white' : 'bg-primary text-primary-foreground',
    popup: theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border border-gray-200',
  };

  // Position of the chat widget
  const positionClasses = {
    container: bubblePosition === 'left' ? 'left-6 items-start' : 'right-6 items-end',
    popup: bubblePosition === 'left' ? 'ml-16' : 'mr-16',
  };

  // Loading animation dots
  const LoadingDots = () => (
    <div className="flex space-x-1 mt-2 ml-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "0ms"}}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "300ms"}}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "600ms"}}></div>
    </div>
  );

  // Display the proper avatar based on availability
  const displayBotAvatar = profilePicture || botAvatar;

  // User message style with custom color
  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  return (
    <div className={`fixed bottom-0 ${positionClasses.container} z-50 flex flex-col`}>
      {/* Initial message popups - only show when chat is closed */}
      {!isOpen && showPopups && visiblePopups.length > 0 && (
        <div className={`mb-4 ${positionClasses.popup} flex flex-col gap-2`}>
          {visiblePopups.map((index) => {
            if (index >= popupMessages.length) return null;
            
            return (
              <div 
                key={index}
                className={`rounded-lg shadow-lg p-4 max-w-[280px] transition-opacity duration-500 opacity-100 animate-fade-in ${themeClasses.popup}`}
                style={{ borderColor: primaryColor }}
              >
                <div className="flex">
                  <Avatar className="h-6 w-6 mr-2 flex-shrink-0">
                    {displayBotAvatar ? (
                      <AvatarImage src={displayBotAvatar} alt={botName} />
                    ) : (
                      <AvatarFallback className="bg-gray-200 text-gray-600">{botName.charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>
                  <p>{popupMessages[index]}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className={`mb-4 w-[350px] sm:w-[400px] flex flex-col rounded-lg shadow-lg h-[calc(100vh-120px)] ${themeClasses.background}`}>
          {/* Chat header */}
          <div 
            className={`p-4 flex items-center justify-between border-b ${themeClasses.header}`} 
            style={{ backgroundColor: primaryColor, color: 'white' }}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 bg-white">
                {displayBotAvatar ? (
                  <AvatarImage src={displayBotAvatar} alt={botName} />
                ) : (
                  <AvatarFallback className="bg-gray-200 text-gray-600">{botName.charAt(0)}</AvatarFallback>
                )}
              </Avatar>
              <span className="font-medium">{botName}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleChat}
              className="text-white hover:bg-white/20"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Chat messages */}
          <div className={`flex-1 overflow-y-auto p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex mb-4 ${
                  msg.sender === "user" ? "justify-end" : ""
                }`}
              >
                {msg.sender === "bot" && (
                  <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                    {displayBotAvatar ? (
                      <AvatarImage src={displayBotAvatar} alt={botName} />
                    ) : (
                      <AvatarFallback className="bg-gray-200 text-gray-600">{botName.charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>
                )}
                
                <div className="flex flex-col max-w-[80%]">
                  <div
                    className={`rounded-lg p-3 text-[0.875rem] ${
                      msg.sender === "bot"
                        ? themeClasses.botBubble
                        : themeClasses.userBubble
                    }`}
                    style={msg.sender === "bot" ? {} : userMessageStyle}
                  >
                    {msg.content}
                  </div>
                  
                  {/* Message actions for bot messages */}
                  {msg.sender === "bot" && showFeedback && (
                    <div className="flex mt-1 space-x-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => handleFeedback(msg.id, "like")}
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
                              onClick={() => handleFeedback(msg.id, "dislike")}
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

                        {allowRegenerate && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={retryLastMessage}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full"
                              >
                                <RefreshCw size={14} className="text-gray-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Regenerate</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                
                {msg.sender === "user" && (
                  <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                    {userAvatar ? (
                      <AvatarImage src={userAvatar} alt="User" />
                    ) : (
                      <AvatarFallback className="bg-gray-200 text-gray-600">U</AvatarFallback>
                    )}
                  </Avatar>
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {isTyping && (
              <div className="flex mb-4">
                <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                  <AvatarImage src={displayBotAvatar} alt={botName} />
                  <AvatarFallback>CB</AvatarFallback>
                </Avatar>
                <div className={`rounded-lg p-3 max-w-[80%] ${themeClasses.botBubble}`}>
                  <LoadingDots />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested messages */}
          {showSuggestions && suggestedMessages.length > 0 && (
            <div className={`p-3 border-t ${themeClasses.background}`}>
              <div className="flex flex-wrap gap-2">
                {suggestedMessages.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className={`rounded-full text-sm ${theme === 'dark' ? 'border-gray-700 text-gray-300' : ''}`}
                    onClick={() => handleSuggestedMessageClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className={`border-t p-3 ${themeClasses.background}`}>
            <form onSubmit={handleSendMessage} className="flex relative">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  >
                    <Smile size={18} className="text-gray-500" />
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
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={messagePlaceholder}
                className={`w-full border rounded-lg pr-10 pl-10 py-2 focus:outline-none focus:ring-1 focus:ring-primary ${themeClasses.inputBg} ${themeClasses.text}`}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                disabled={!message.trim()}
              >
                <Send size={18} className="text-gray-500" />
              </Button>
            </form>
            {footer && (
              <div className="text-xs text-center mt-2 text-gray-500">
                {footer}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Floating button - styled to match wonderwave.js */}
      <Button
        onClick={toggleChat}
        className="rounded-full h-14 w-14 shadow-lg flex items-center justify-center p-0 mb-6 overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? (
          <ChevronDown size={24} className="text-white" />
        ) : (
          <>
            {chatIcon ? (
              <div className="h-full w-full flex items-center justify-center overflow-hidden">
                <img 
                  src={chatIcon} 
                  alt="Chat" 
                  className="h-full w-full object-cover" 
                />
              </div>
            ) : (
              <MessageCircle size={24} className="text-white" />
            )}
          </>
        )}
      </Button>
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

export default ChatbotWidget;
