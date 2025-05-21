
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
}

// Emoji list for the emoji picker
const emojis = ["😊", "👍", "👋", "🙏", "❤️", "🎉", "🔥", "✨", "🤔", "😂", "🚀", "👏", "🌟", "💡", "👀", "💪", "🙌", "👌", "💯", "🎯"];

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  productName = "Chatbase",
  botName = "Chatbase AI",
  botAvatar = "/placeholder.svg",
  userAvatar,
  primaryColor = "#000000",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      content: `👋 Hi! I am ${botName}, ask me anything about ${productName}!`,
      sender: "bot",
      timestamp: new Date(),
    },
    {
      id: "intro",
      content: `By the way, you can create a chatbot like me for your website! 🤩`,
      sender: "bot",
      timestamp: new Date(Date.now() + 1000),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  // Loading animation dots
  const LoadingDots = () => (
    <div className="flex space-x-1 mt-2 ml-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "0ms"}}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "300ms"}}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "600ms"}}></div>
    </div>
  );

  return (
    <div className="fixed bottom-0 right-6 z-50 flex flex-col items-end">
      {/* Chat window */}
      {isOpen && (
        <div className="mb-4 w-[350px] sm:w-[400px] flex flex-col rounded-lg shadow-lg bg-white border border-gray-200 h-[calc(100vh-120px)]">
          {/* Chat header */}
          <div 
            className="p-4 flex items-center justify-between border-b" 
            style={{ backgroundColor: primaryColor, color: 'white' }}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 bg-white">
                <AvatarImage src={botAvatar} alt={botName} />
                <AvatarFallback>CB</AvatarFallback>
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
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex mb-4 ${
                  msg.sender === "user" ? "justify-end" : ""
                }`}
              >
                {msg.sender === "bot" && (
                  <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                    <AvatarImage src={botAvatar} alt={botName} />
                    <AvatarFallback>CB</AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex flex-col max-w-[80%]">
                  <div
                    className={`rounded-lg p-3 text-[0.875rem] ${
                      msg.sender === "bot"
                        ? "bg-white border border-gray-200"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                  
                  {/* Message actions for bot messages */}
                  {msg.sender === "bot" && (
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
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                
                {msg.sender === "user" && (
                  <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                    <AvatarFallback>U</AvatarFallback>
                    {userAvatar && <AvatarImage src={userAvatar} alt="User" />}
                  </Avatar>
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {isTyping && (
              <div className="flex mb-4">
                <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                  <AvatarImage src={botAvatar} alt={botName} />
                  <AvatarFallback>CB</AvatarFallback>
                </Avatar>
                <div className="rounded-lg p-3 bg-white border border-gray-200 max-w-[80%]">
                  <LoadingDots />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form onSubmit={handleSendMessage} className="border-t p-3 bg-white">
            <div className="flex relative">
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
                <PopoverContent className="w-64 p-2">
                  <div className="grid grid-cols-5 gap-2">
                    {emojis.map((emoji, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
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
                placeholder="Message..."
                className="flex-1 border rounded-lg pr-10 pl-10 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
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
            </div>
            <div className="text-xs text-center mt-2 text-gray-500">
              By chatting, you agree to our <a href="#" className="underline hover:text-gray-700">privacy policy</a>.
            </div>
          </form>
        </div>
      )}
      
      {/* Floating button */}
      <Button
        onClick={toggleChat}
        className="rounded-full h-14 w-14 shadow-lg flex items-center justify-center p-0 mb-6"
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? (
          <ChevronDown size={24} />
        ) : (
          <MessageCircle size={24} />
        )}
      </Button>
    </div>
  );
};

export default ChatbotWidget;
