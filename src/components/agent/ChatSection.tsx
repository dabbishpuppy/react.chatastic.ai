
import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RefreshCw, SendIcon } from "lucide-react";

interface ChatMessage {
  isAgent: boolean;
  content: string;
  timestamp: string;
}

interface ChatSectionProps {
  initialMessages?: ChatMessage[];
}

const ChatSection: React.FC<ChatSectionProps> = ({ initialMessages = [] }) => {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

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
        content: "I'm Wonder AI. I'm here to help you with any questions or tasks!",
        timestamp: new Date().toISOString()
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-md overflow-hidden border shadow-sm">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10 bg-violet-600">
            <AvatarImage src="/placeholder.svg" alt="Agent" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <span className="font-medium">AI Customer Service</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2">
            Compare
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex mb-4 ${msg.isAgent ? '' : 'justify-end'}`}>
            {msg.isAgent && (
              <Avatar className="h-8 w-8 mr-2 mt-1">
                <AvatarImage src="/placeholder.svg" alt="Agent" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
            <div className={`rounded-lg p-3 max-w-[80%] ${
              msg.isAgent ? 'bg-gray-100' : 'bg-primary text-primary-foreground'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
        <div className="flex items-center w-full relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write message here..."
            className="w-full border rounded-full px-4 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button 
            type="submit" 
            size="icon" 
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
