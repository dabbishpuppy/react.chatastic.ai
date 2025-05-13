
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Conversation } from "@/components/activity/ConversationData";

interface ConversationViewProps {
  conversation: Conversation | null;
  onClose: () => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ conversation, onClose }) => {
  if (!conversation) return null;

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Conversation</span>
          <span className="text-sm text-muted-foreground">
            Started {new Date(conversation.startedAt).toLocaleString()}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.messages.map((message, idx) => (
          <div key={idx} className={`flex gap-2 ${message.sender === 'agent' ? '' : 'justify-end'}`}>
            {message.sender === 'agent' && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarImage src="/placeholder.svg" alt="Agent" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}
            <div
              className={`rounded-lg p-3 max-w-[80%] ${
                message.sender === 'agent' ? 'bg-gray-100' : 'bg-primary text-primary-foreground'
              }`}
            >
              {message.content}
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
            {message.sender === 'user' && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationView;
