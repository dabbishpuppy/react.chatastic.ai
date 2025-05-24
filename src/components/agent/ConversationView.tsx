
import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation } from "@/components/activity/ConversationData";

interface ConversationViewProps {
  conversation: Conversation;
  onClose: () => void;
  onDelete?: () => void;
  theme?: 'light' | 'dark';
  profilePicture?: string;
  displayName?: string;
  userMessageColor?: string;
  showDeleteButton?: boolean;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  onClose,
  onDelete,
  theme = 'light',
  profilePicture,
  displayName = "AI Assistant",
  userMessageColor,
  showDeleteButton = false
}) => {
  const isDark = theme === 'dark';
  
  const getContrastColor = (backgroundColor: string): string => {
    // Simple contrast calculation
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  // Determine status based on conversation data
  const status = conversation.snippet.includes('Active') ? 'active' : 'ended';

  return (
    <div className={`border rounded-lg h-[calc(100vh-240px)] flex flex-col ${
      isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profilePicture} alt={displayName} />
            <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {conversation.title}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded ${
                status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {status}
              </span>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                • {conversation.source}
              </span>
            </div>
          </div>
        </div>
        {showDeleteButton && onDelete ? (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onDelete}
            className={`${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-600'}`}
          >
            <Trash2 size={16} />
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}
          >
            ×
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
        isDark ? 'bg-gray-900' : 'bg-white'
      }`} style={{ scrollbarWidth: 'thin' }}>
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex items-start gap-2 max-w-[80%]">
              {message.role === 'assistant' && (
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={profilePicture} alt={displayName} />
                  <AvatarFallback className="text-xs">{displayName.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`px-3 py-2 rounded-lg text-sm ${
                  message.role === 'user'
                    ? userMessageColor 
                      ? 'text-white' 
                      : isDark 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-500 text-white'
                    : isDark
                      ? 'bg-gray-800 text-gray-100'
                      : 'bg-gray-100 text-gray-900'
                }`}
                style={message.role === 'user' ? userMessageStyle : {}}
              >
                <p style={{ fontSize: '0.875rem' }}>{message.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationView;
