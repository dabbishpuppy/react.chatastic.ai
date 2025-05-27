
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Conversation } from "@/components/activity/ConversationData";
import { analyticsService } from "@/services/analyticsService";
import { getContrastColor } from "@/components/agent/chat/ThemeConfig";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConversationViewProps {
  conversation: Conversation;
  onClose: () => void;
  onDelete: () => void;
  theme?: 'light' | 'dark';
  profilePicture?: string;
  displayName?: string;
  userMessageColor?: string;
  showDeleteButton?: boolean;
  initialMessage?: string;
  conversationStatus?: string;
  conversationSource?: string;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  onClose,
  onDelete,
  theme = 'light',
  profilePicture,
  displayName = 'AI Assistant',
  userMessageColor = '#000000',
  showDeleteButton = false,
  initialMessage,
  conversationStatus,
  conversationSource
}) => {
  const [localMessages, setLocalMessages] = useState(conversation.messages);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        description: "Copied to clipboard!",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        description: "Failed to copy to clipboard",
        duration: 2000,
        variant: "destructive"
      });
    }
  };

  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  // Display all messages in their exact database order, including initial message if needed
  const messagesToDisplay = React.useMemo(() => {
    const messages = [];
    
    // Only add initial message if there are no messages or if first message is not from assistant
    if (initialMessage && (localMessages.length === 0 || localMessages[0]?.role !== 'assistant')) {
      messages.push({
        id: 'initial-message',
        role: 'assistant' as const,
        content: initialMessage,
        timestamp: '',
        feedback: undefined
      });
    }
    
    // Add all conversation messages in their exact order
    messages.push(...localMessages);
    
    return messages;
  }, [localMessages, initialMessage]);

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  return (
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'} rounded-lg border`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            {profilePicture ? (
              <AvatarImage src={profilePicture} alt={displayName} />
            ) : (
              <AvatarFallback className="bg-gray-100" />
            )}
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{conversation.title}</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{conversation.daysAgo}</span>
              <span>•</span>
              <span>{conversation.source}</span>
              {conversationStatus && (
                <>
                  <span>•</span>
                  <span className="capitalize">{conversationStatus}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {showDeleteButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesToDisplay.map((message, index) => (
          <div key={message.id || index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <Avatar className="h-8 w-8 mr-2 mt-1 border-0">
                {profilePicture ? (
                  <AvatarImage src={profilePicture} alt={displayName} />
                ) : (
                  <AvatarFallback className="bg-gray-100" />
                )}
              </Avatar>
            )}
            
            <div className="flex flex-col max-w-[80%]">
              {/* Message bubble */}
              <div 
                className={`rounded-lg p-3 text-sm ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white ml-auto' 
                    : theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-black'
                }`}
                style={message.role === 'user' ? userMessageStyle : {}}
              >
                {message.content}
              </div>
              
              {/* Feedback buttons for assistant messages */}
              {message.role === 'assistant' && message.id && message.id !== 'initial-message' && (
                <div className="flex items-center space-x-1 mt-2">
                  <div
                    className={`inline-flex items-center justify-center h-8 w-8 rounded-md cursor-default ${
                      message.feedback === "like" 
                        ? "bg-green-100 text-green-600" 
                        : "bg-gray-100 text-gray-400"
                    }`}
                    title={message.feedback === "like" ? "Liked" : "Like"}
                  >
                    <ThumbsUp size={14} />
                  </div>
                  
                  <div
                    className={`inline-flex items-center justify-center h-8 w-8 rounded-md cursor-default ${
                      message.feedback === "dislike" 
                        ? "bg-red-100 text-red-600" 
                        : "bg-gray-100 text-gray-400"
                    }`}
                    title={message.feedback === "dislike" ? "Disliked" : "Dislike"}
                  >
                    <ThumbsDown size={14} />
                  </div>
                  
                  <button
                    onClick={() => handleCopy(message.content)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300 transition-all duration-200"
                    title="Copy"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConversationView;
