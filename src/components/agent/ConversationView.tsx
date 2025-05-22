import React from "react";
import { Conversation, Message } from "../activity/ConversationData";

interface ConversationViewProps {
  conversation: Conversation;
  onClose: () => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ conversation, onClose }) => {
  // Instead of using startedAt which doesn't exist, let's use the first message timestamp
  const startTime = conversation.messages.length > 0 
    ? new Date(conversation.messages[0].timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }) 
    : "Unknown time";

  // Fix sender property issue by using the role property that exists in our Message type
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] p-3 rounded-lg ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          <div className="flex items-center mb-1">
            <span className="font-medium">{isUser ? 'You' : 'Assistant'}</span>
            <span className="text-xs ml-2 opacity-70">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
              })}
            </span>
          </div>
          <p>{message.content}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h3 className="font-medium">{conversation.title}</h3>
          <div className="text-xs text-gray-500">
            Started at {startTime} • {conversation.daysAgo}
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-800"
          aria-label="Close conversation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {conversation.messages.map(renderMessage)}
      </div>
    </div>
  );
};

export default ConversationView;
