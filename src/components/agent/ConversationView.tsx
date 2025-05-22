
import React from "react";
import { Conversation, Message } from "../activity/ConversationData";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ConversationViewProps {
  conversation: Conversation;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

const ConversationView: React.FC<ConversationViewProps> = ({ 
  conversation, 
  onClose, 
  theme = 'light' 
}) => {
  // Instead of using startedAt which doesn't exist, let's use the first message timestamp
  const startTime = conversation.messages.length > 0 
    ? new Date(conversation.messages[0].timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }) 
    : "Unknown time";

  // Apply theme based on settings
  const themeClasses = {
    container: theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white',
    header: theme === 'dark' ? 'border-gray-800' : 'border-b',
    agentBubble: theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-gray-200',
    userBubble: theme === 'dark' ? 'bg-blue-900 text-white' : 'bg-blue-600 text-white',
    userText: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
    timestamp: theme === 'dark' ? 'opacity-50' : 'opacity-70',
    closeButton: theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800',
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        {!isUser && (
          <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
            <AvatarFallback>AI</AvatarFallback>
            <AvatarImage src="/placeholder.svg" alt="Assistant" />
          </Avatar>
        )}
        
        <div className={`max-w-[80%] p-3 rounded-lg ${isUser ? themeClasses.userBubble : themeClasses.agentBubble}`}>
          <div className="flex items-center mb-1">
            <span className="font-medium">{isUser ? 'You' : 'Assistant'}</span>
            <span className={`text-xs ml-2 ${themeClasses.timestamp}`}>
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
              })}
            </span>
          </div>
          <p>{message.content}</p>
        </div>
        
        {isUser && (
          <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
            <AvatarFallback>You</AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div className={`rounded-lg shadow-lg overflow-hidden h-full flex flex-col ${themeClasses.container}`}>
      <div className={`p-4 border-b flex justify-between items-center ${themeClasses.header}`}>
        <div>
          <h3 className="font-medium">{conversation.title}</h3>
          <div className={`text-xs ${themeClasses.userText}`}>
            Started at {startTime} • {conversation.daysAgo}
          </div>
        </div>
        <Button 
          variant="ghost"
          size="icon"
          onClick={onClose} 
          className={themeClasses.closeButton}
          aria-label="Close conversation"
        >
          <X size={18} />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {conversation.messages.map(renderMessage)}
      </div>
    </div>
  );
};

export default ConversationView;
