
import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Types for our chat messages
interface ChatMessage {
  id: string;
  content: string;
  sender: "bot" | "user";
  timestamp: Date;
}

// Props for the ChatbotWidget component
interface ChatbotWidgetProps {
  productName?: string;
  botName?: string;
  botAvatar?: string;
  userAvatar?: string;
  primaryColor?: string;
}

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

    // Simulate bot response after a delay
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm a demo chatbot. This is a static reply to your message. In a real implementation, this would be connected to an LLM API.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat window */}
      {isOpen && (
        <div className="mb-4 w-[350px] sm:w-[400px] flex flex-col rounded-lg shadow-lg bg-white overflow-hidden border border-gray-200">
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
          <div className="flex-1 overflow-y-auto p-4 h-[350px] bg-gray-50">
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
                
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    msg.sender === "bot"
                      ? "bg-white border border-gray-200"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {msg.content}
                </div>
                
                {msg.sender === "user" && (
                  <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
                    <AvatarFallback>U</AvatarFallback>
                    {userAvatar && <AvatarImage src={userAvatar} alt="User" />}
                  </Avatar>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form onSubmit={handleSendMessage} className="border-t p-3 bg-white">
            <div className="flex relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message..."
                className="flex-1 border rounded-lg pr-10 pl-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
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
        className="rounded-full h-14 w-14 shadow-lg flex items-center justify-center p-0"
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
