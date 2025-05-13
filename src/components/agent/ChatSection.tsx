
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
        content: "I'm an AI assistant. I'm here to help you with any questions or tasks!",
        timestamp: new Date().toISOString()
      }]);
    }, 1000);
  };

  return (
    <Card className="mx-auto w-full max-w-3xl h-full bg-white overflow-hidden flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 bg-violet-600">
            <AvatarImage src="/placeholder.svg" alt="Agent" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <span className="font-medium">AI Customer Service</span>
        </div>
        <Button size="icon" variant="ghost">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex mb-4 ${msg.isAgent ? '' : 'justify-end'}`}>
            {msg.isAgent && (
              <Avatar className="h-8 w-8 mr-2">
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
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write message here..."
          className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="submit">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-90">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </Button>
      </form>
    </Card>
  );
};

export default ChatSection;
