
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Conversation } from "@/components/activity/ConversationData";
import { analyticsService } from "@/services/analyticsService";
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

  const handleFeedback = async (messageId: string, feedbackType: "like" | "dislike") => {
    const messageIndex = localMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const currentMessage = localMessages[messageIndex];
    const newFeedback = currentMessage.feedback === feedbackType ? null : feedbackType;
    
    try {
      const success = await analyticsService.updateMessageFeedback(messageId, newFeedback);
      
      if (success) {
        const updatedMessages = [...localMessages];
        updatedMessages[messageIndex] = {
          ...currentMessage,
          feedback: newFeedback || undefined
        };
        setLocalMessages(updatedMessages);
        
        toast({
          description: newFeedback ? `Feedback ${feedbackType === 'like' ? 'liked' : 'disliked'}` : "Feedback removed",
          duration: 2000,
        });
      } else {
        toast({
          description: "Failed to update feedback",
          duration: 2000,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast({
        description: "Failed to update feedback",
        duration: 2000,
        variant: "destructive"
      });
    }
  };

  const getContrastColor = (backgroundColor: string): string => {
    if (!backgroundColor) return '#000000';
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

  // Create a complete timeline starting with initial message
  const fullConversationTimeline = React.useMemo(() => {
    const timeline = [];
    
    // Add initial message first if it exists
    if (initialMessage) {
      timeline.push({
        id: 'initial-message',
        role: 'assistant' as const,
        content: initialMessage,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day before to ensure it's first
        feedback: undefined
      });
    }
    
    // Add all actual conversation messages
    timeline.push(...localMessages);
    
    // Sort by timestamp to ensure proper order (initial message should be first)
    return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [localMessages, initialMessage]);

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  return (
    <>
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
          {fullConversationTimeline.map((message, index) => (
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
                
                {/* Action buttons for assistant messages */}
                {message.role === 'assistant' && message.id && message.id !== 'initial-message' && (
                  <div className="flex items-center space-x-1 mt-2">
                    {/* Like button */}
                    <button
                      onClick={() => handleFeedback(message.id, "like")}
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 ${
                        message.feedback === "like" 
                          ? "bg-green-100 text-green-600 hover:bg-green-200" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300"
                      }`}
                      title="Like"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    
                    {/* Dislike button */}
                    <button
                      onClick={() => handleFeedback(message.id, "dislike")}
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-200 ${
                        message.feedback === "dislike" 
                          ? "bg-red-100 text-red-600 hover:bg-red-200" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 active:bg-gray-300"
                      }`}
                      title="Dislike"
                    >
                      <ThumbsDown size={14} />
                    </button>
                    
                    {/* Copy button */}
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
    </>
  );
};

export default ConversationView;
