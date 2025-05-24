import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ChevronDown, Copy, RefreshCw, ThumbsUp, ThumbsDown, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSharedChatLogic } from "@/hooks/useSharedChatLogic";
import { useParams } from "react-router-dom";

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
  bubbleColor?: string | null;
  hideUserAvatar?: boolean;
}

// Emoji list for the emoji picker
const emojis = ["😊", "👍", "👋", "🙏", "❤️", "🎉", "🔥", "✨", "🤔", "😂", "🚀", "👏", "🌟", "💡", "👀", "💪", "🙌", "👌", "💯", "🎯"];

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  productName = "Chatbase",
  botName,
  botAvatar = "/placeholder.svg",
  userAvatar,
  primaryColor = "#000000",
  showPopups = true,
  theme = 'light',
  bubblePosition = 'right',
  autoShowDelay = 1,
  showFeedback = true,
  allowRegenerate = true,
  initialMessage,
  suggestedMessages = [],
  showSuggestions = true,
  messagePlaceholder = "Message...",
  footer,
  chatIcon,
  profilePicture,
  userMessageColor,
  bubbleColor,
  hideUserAvatar = false,
}) => {
  const { agentId } = useParams();
  const { settings, inputRef, handleMessageSubmission, generateAgentResponse, focusInput } = useSharedChatLogic(agentId);
  
  // Use real settings if available, otherwise fall back to props
  const displayName = settings?.display_name || botName || "Chatbase AI";
  const realInitialMessage = settings?.initial_message || initialMessage || "👋 Hi! I am an AI chatbot, ask me anything!";
  const realSuggestedMessages = settings?.suggested_messages?.map(msg => msg.text) || suggestedMessages;
  const realShowSuggestions = settings?.show_suggestions_after_chat ?? showSuggestions;
  const realPlaceholder = settings?.message_placeholder || messagePlaceholder;
  const realShowFeedback = settings?.show_feedback ?? showFeedback;
  const realAllowRegenerate = settings?.allow_regenerate ?? allowRegenerate;
  const realTheme = settings?.theme || theme;
  const realProfilePicture = settings?.profile_picture || profilePicture;
  const realFooter = settings?.footer || footer;
  const realChatIcon = settings?.chat_icon || chatIcon;
  const realUserMessageColor = settings?.user_message_color || userMessageColor;
  const realBubbleColor = settings?.bubble_color || bubbleColor;
  const realBubblePosition = settings?.bubble_position || bubblePosition;
  const realAutoShowDelay = settings?.auto_show_delay ?? autoShowDelay;

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initial message popups state
  const [popupMessages] = useState<string[]>(realInitialMessage.split('\n').filter(Boolean));
  const [visiblePopups, setVisiblePopups] = useState<number[]>([]);
  
  // Set initial welcome messages when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      const initialMessages = realInitialMessage.split('\n').filter(Boolean).map((content, index) => ({
        id: `welcome-${index}`,
        content,
        sender: "bot" as const,
        timestamp: new Date(Date.now() + index * 1000),
      }));
      
      setMessages(initialMessages);
    }
  }, [realInitialMessage]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show popups when chat is closed
  useEffect(() => {
    if (!isOpen && showPopups) {
      if (realAutoShowDelay <= 0) return;
      
      setVisiblePopups([]);
      
      const popupList = popupMessages.length > 0 ? popupMessages : ["👋 Hi! I am an AI assistant!"];
      
      const firstPopupTimeout = setTimeout(() => {
        setVisiblePopups([0]);
        
        if (popupList.length > 1) {
          const subsequentTimeouts: NodeJS.Timeout[] = [];
          
          for (let i = 1; i < popupList.length; i++) {
            const timeout = setTimeout(() => {
              setVisiblePopups(prev => [...prev, i]);
            }, i * 2000);
            
            subsequentTimeouts.push(timeout);
          }
          
          return () => subsequentTimeouts.forEach(timeout => clearTimeout(timeout));
        }
      }, realAutoShowDelay * 1000);
      
      return () => clearTimeout(firstPopupTimeout);
    } else {
      setVisiblePopups([]);
    }
  }, [isOpen, showPopups, realAutoShowDelay, popupMessages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isTyping || rateLimitError) return;

    const messageToSend = message.trim();
    setMessage("");

    await handleMessageSubmission(
      messageToSend,
      (userMessage) => {
        // Convert to widget format
        const widgetMessage: ChatMessage = {
          id: Date.now().toString(),
          content: userMessage.content,
          sender: "user",
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, widgetMessage]);
        setIsTyping(true);

        // Generate bot response
        setTimeout(() => {
          setIsTyping(false);
          const botResponse = generateAgentResponse(messageToSend);
          const widgetBotMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: botResponse.content,
            sender: "bot",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, widgetBotMessage]);
          focusInput();
        }, 1500);
      },
      (error, timeUntilReset) => {
        setRateLimitError(error);
        if (timeUntilReset) {
          setTimeUntilReset(timeUntilReset);
          
          // Start countdown
          const countdown = setInterval(() => {
            setTimeUntilReset(prev => {
              if (prev && prev <= 1) {
                clearInterval(countdown);
                setRateLimitError(null);
                setTimeUntilReset(null);
                focusInput();
                return null;
              }
              return prev ? prev - 1 : null;
            });
          }, 1000);
        }
      }
    );

    focusInput();
  };

  const copyMessageToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const retryLastMessage = () => {
    if (!realAllowRegenerate) return;
    
    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.sender === "user");
    if (lastUserMessageIndex === -1) return;
    
    const messagesToKeep = messages.slice(0, messages.length - lastUserMessageIndex);
    setMessages(messagesToKeep);
    
    setIsTyping(true);
    
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
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleSuggestedMessageClick = async (text: string) => {
    if (isTyping || rateLimitError) return;
    
    await handleMessageSubmission(
      text,
      (userMessage) => {
        const widgetMessage: ChatMessage = {
          id: Date.now().toString(),
          content: userMessage.content,
          sender: "user",
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, widgetMessage]);
        setIsTyping(true);

        setTimeout(() => {
          setIsTyping(false);
          const botResponse = generateAgentResponse(text);
          const widgetBotMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: botResponse.content,
            sender: "bot",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, widgetBotMessage]);
          focusInput();
        }, 1500);
      },
      (error, timeUntilReset) => {
        setRateLimitError(error);
        if (timeUntilReset) {
          setTimeUntilReset(timeUntilReset);
        }
      }
    );

    focusInput();
  };

  // Apply theme based on settings
  const themeClasses = {
    background: realTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    header: realTheme === 'dark' ? 'bg-gray-800 text-white' : '',
    text: realTheme === 'dark' ? 'text-white' : 'text-gray-800',
    inputBg: realTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    botBubble: realTheme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border border-gray-200',
    userBubble: realTheme === 'dark' ? 'bg-blue-900 text-white' : 'bg-primary text-primary-foreground',
    popup: realTheme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border border-gray-200',
  };

  // Position of the chat widget
  const positionClasses = {
    container: realBubblePosition === 'left' ? 'left-6 items-start' : 'right-6 items-end',
    popup: realBubblePosition === 'left' ? 'ml-16' : 'mr-16',
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
  const displayBotAvatar = realProfilePicture || botAvatar;

  // User message style with custom color
  const userMessageStyle = realUserMessageColor ? {
    backgroundColor: realUserMessageColor,
    color: '#FFFFFF'
  } : {};

  // Chat bubble style with custom color
  const chatBubbleStyle = realBubbleColor ? {
    backgroundColor: realBubbleColor
  } : { backgroundColor: primaryColor };

  return (
    <>
      {/* Chat Widget Container */}
      <div className={`fixed bottom-6 ${positionClasses.container} z-50 flex flex-col max-w-sm`}>
        {/* Message Popups */}
        {visiblePopups.map((index) => (
          <div
            key={index}
            className={`mb-4 p-3 rounded-lg shadow-lg max-w-xs ${positionClasses.popup} ${themeClasses.popup} animate-in slide-in-from-bottom duration-300`}
          >
            <div className="flex items-start space-x-2">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={displayBotAvatar} alt={displayName} />
                <AvatarFallback className="text-xs">
                  {displayName?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm">{popupMessages[index]}</p>
            </div>
          </div>
        ))}

        {/* Chat Interface */}
        {isOpen && (
          <div className={`mb-4 w-96 h-[500px] rounded-lg shadow-xl ${themeClasses.background} border border-gray-200 flex flex-col animate-in slide-in-from-bottom duration-300`}>
            {/* Header */}
            <div className={`p-4 border-b border-gray-200 flex items-center justify-between ${themeClasses.header || 'bg-white'}`}>
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={displayBotAvatar} alt={displayName} />
                  <AvatarFallback>
                    {displayName?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className={`font-semibold ${themeClasses.text}`}>{displayName}</h3>
                  <p className={`text-xs ${themeClasses.text} opacity-70`}>Online</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleChat}
                className={`h-6 w-6 ${themeClasses.text} hover:bg-gray-100`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Rate Limit Error */}
            {rateLimitError && (
              <div className="p-3 bg-red-50 border-b border-red-200">
                <p className="text-sm text-red-600">{rateLimitError}</p>
                {timeUntilReset && (
                  <p className="text-xs text-red-500 mt-1">
                    Try again in {timeUntilReset} seconds
                  </p>
                )}
              </div>
            )}

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${themeClasses.background}`}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex items-start space-x-2 max-w-xs ${msg.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                    {msg.sender === "bot" && (
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={displayBotAvatar} alt={displayName} />
                        <AvatarFallback className="text-xs">
                          {displayName?.charAt(0) || "A"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {msg.sender === "user" && !hideUserAvatar && (
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={userAvatar} alt="You" />
                        <AvatarFallback className="text-xs">You</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`p-3 rounded-lg ${
                        msg.sender === "bot"
                          ? themeClasses.botBubble
                          : themeClasses.userBubble
                      }`}
                      style={msg.sender === "user" ? userMessageStyle : {}}
                    >
                      <p className="text-sm">{msg.content}</p>
                      
                      {/* Bot message actions */}
                      {msg.sender === "bot" && (
                        <div className="flex items-center space-x-2 mt-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyMessageToClipboard(msg.content)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy message</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {realShowFeedback && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-6 w-6 ${msg.feedback === "like" ? "text-green-600" : ""}`}
                                      onClick={() => handleFeedback(msg.id, "like")}
                                    >
                                      <ThumbsUp className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Like</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-6 w-6 ${msg.feedback === "dislike" ? "text-red-600" : ""}`}
                                      onClick={() => handleFeedback(msg.id, "dislike")}
                                    >
                                      <ThumbsDown className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Dislike</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}

                          {realAllowRegenerate && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={retryLastMessage}
                                    disabled={isTyping}
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Regenerate</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={displayBotAvatar} alt={displayName} />
                      <AvatarFallback className="text-xs">
                        {displayName?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`p-3 rounded-lg ${themeClasses.botBubble}`}>
                      <LoadingDots />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Messages */}
            {realShowSuggestions && realSuggestedMessages.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {realSuggestedMessages.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSuggestedMessageClick(suggestion)}
                      disabled={isTyping || !!rateLimitError}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={realPlaceholder}
                    disabled={isTyping || !!rateLimitError}
                    className={`w-full p-2 pr-10 border rounded-lg resize-none ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  
                  {/* Emoji picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                        disabled={isTyping || !!rateLimitError}
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2">
                      <div className="grid grid-cols-8 gap-1">
                        {emojis.map((emoji, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                            onClick={() => insertEmoji(emoji)}
                          >
                            {emoji}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || isTyping || !!rateLimitError}
                  style={chatBubbleStyle}
                  className="text-white hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              {/* Footer */}
              {realFooter && (
                <p className="text-xs text-gray-500 mt-2 text-center">{realFooter}</p>
              )}
            </div>
          </div>
        )}

        {/* Chat Bubble Button */}
        <Button
          onClick={toggleChat}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
          style={chatBubbleStyle}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : realChatIcon ? (
            <img src={realChatIcon} alt="Chat" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white" />
          )}
        </Button>
      </div>
    </>
  );
};

export default ChatbotWidget;
