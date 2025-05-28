import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getContrastColor } from "@/components/agent/chat/ThemeConfig";
import { supabase } from "@/integrations/supabase/client";
import { conversationLoader, ConversationMessage } from "@/services/conversationLoader";
import SharedChatMessage from "@/components/agent/chat/SharedChatMessage";
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
  conversation: {
    id: string;
    title: string;
    daysAgo: string;
    source: string;
    messages?: ConversationMessage[];
  };
  onClose: () => void;
  onDelete: () => void;
  theme?: 'light' | 'dark';
  profilePicture?: string;
  displayName?: string;
  userMessageColor?: string;
  showDeleteButton?: boolean;
  conversationStatus?: string;
  conversationSource?: string;
  agentId?: string;
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
  conversationStatus,
  conversationSource,
  agentId
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>(conversation.messages || []);
  const [isLoading, setIsLoading] = useState(!conversation.messages);

  // Load conversation messages with greeting if not provided
  useEffect(() => {
    const loadMessages = async () => {
      if (conversation.messages || !conversation.id || !agentId) {
        if (conversation.messages) {
          setMessages(conversation.messages);
        }
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const loadedMessages = await conversationLoader.loadConversationWithGreeting(
          conversation.id,
          agentId
        );
        setMessages(loadedMessages);
      } catch (error) {
        console.error('Error loading conversation messages:', error);
        toast({
          description: "Failed to load conversation messages",
          duration: 2000,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversation.id, conversation.messages, agentId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversation.id) return;

    console.log('🔄 Setting up real-time subscription for conversation:', conversation.id);
    
    const channel = supabase
      .channel(`conversation-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        async (payload) => {
          console.log('📨 Real-time message received:', payload);
          
          const newMessage = payload.new as any;
          const messageToAdd: ConversationMessage = {
            id: newMessage.id,
            role: newMessage.is_agent ? 'assistant' : 'user',
            content: newMessage.content,
            timestamp: newMessage.timestamp,
            feedback: newMessage.feedback as 'like' | 'dislike' | undefined
          };

          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(msg => msg.id === messageToAdd.id);
            if (exists) {
              console.log('⚠️ Message already exists, skipping duplicate');
              return prev;
            }

            const updated = [...prev, messageToAdd];
            // Sort by timestamp to maintain order
            updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            console.log('✅ Added new message to conversation view');
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          console.log('📝 Real-time message update received:', payload);
          
          const updatedMessage = payload.new as any;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id 
              ? {
                  ...msg,
                  content: updatedMessage.content,
                  feedback: updatedMessage.feedback as 'like' | 'dislike' | undefined
                }
              : msg
          ));
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  const handleFeedback = (timestamp: string, type: "like" | "dislike") => {
    // In read-only mode, don't allow feedback changes
    console.log('Feedback display only - not updating in view mode');
  };

  const handleCopy = (content: string) => {
    // Copy functionality is disabled in read-only mode
    console.log('Copy disabled in view mode');
  };

  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  // Find the last agent message index for regenerate button
  const lastAgentMessageIndex = messages.reduceRight((lastIndex, msg, index) => {
    return lastIndex === -1 && msg.role === 'assistant' && msg.id !== 'initial-message' ? index : lastIndex;
  }, -1);

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
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No messages in this conversation
          </div>
        ) : (
          messages.map((message, index) => (
            <SharedChatMessage
              key={message.id || index}
              message={message}
              agentName={displayName}
              profilePicture={profilePicture}
              showFeedback={true}
              hideUserAvatar={false}
              readOnly={true}
              onFeedback={handleFeedback}
              onCopy={handleCopy}
              allowRegenerate={false}
              agentBubbleClass={theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-black'}
              userBubbleClass="bg-blue-500 text-white ml-auto"
              userMessageStyle={userMessageStyle}
              isLastAgentMessage={index === lastAgentMessageIndex}
              theme={theme}
            />
          ))
        )}
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
