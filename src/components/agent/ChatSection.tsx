
import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RefreshCw, SendIcon, Settings } from "lucide-react";

interface ChatMessage {
  isAgent: boolean;
  content: string;
  timestamp: string;
}

interface ChatSectionProps {
  initialMessages?: ChatMessage[];
  toggleSettings?: () => void;
  agentName?: string;
}

const ChatSection: React.FC<ChatSectionProps> = ({ 
  initialMessages = [], 
  toggleSettings,
  agentName = "AI Customer Service"
}) => {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialMessages.length ? initialMessages : [
    {
      isAgent: true,
      content: "Hi! I'm Wonder AI. How can I help you today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Update chat when initialMessages prop changes
  useEffect(() => {
    if (initialMessages.length > 0) {
      setChatHistory(initialMessages);
    }
  }, [initialMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add user message to chat history
    setChatHistory([...chatHistory, {
      isAgent: false,
      content: message,
      timestamp: new Date().toISOString()
    }]);
    
    // Clear message input
    setMessage("");
    
    // Simulate agent response (would be replaced with actual API call)
    setTimeout(() => {
      setChatHistory(prev => [...prev, {
        isAgent: true,
        content: "I'm here to help you with any questions or tasks!",
        timestamp: new Date().toISOString()
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full max-w-[800px] mx-auto">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10 border-0">
            <AvatarImage src="/placeholder.svg" alt="Agent" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <span className="font-medium">{agentName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <RefreshCw className="h-5 w-5" />
          </Button>
          {toggleSettings && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={toggleSettings}
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex mb-4 ${msg.isAgent ? '' : 'justify-end'}`}>
            {msg.isAgent && (
              <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
                <AvatarImage src="/placeholder.svg" alt="Agent" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
            <div className={`rounded-lg p-3 max-w-[80%] text-sm ${
              msg.isAgent ? 'bg-gray-100' : 'bg-primary text-primary-foreground'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex items-center w-full relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write message here..."
            className="w-full border rounded-full px-4 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button 
            type="submit" 
            size="sm" 
            variant="ghost"
            className="absolute right-1 rounded-full h-8 w-8"
          >
            <SendIcon size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatSection;
