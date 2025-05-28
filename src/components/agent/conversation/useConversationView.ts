
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { conversationLoader, ConversationMessage } from "@/services/conversationLoader";
import { getContrastColor } from "@/components/agent/chat/ThemeConfig";
import { analyticsService } from "@/services/analyticsService";

interface UseConversationViewProps {
  conversation: {
    id: string;
    messages?: ConversationMessage[];
  };
  agentId?: string;
  userMessageColor?: string;
}

export const useConversationView = ({ conversation, agentId, userMessageColor }: UseConversationViewProps) => {
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

  // Real-time subscription for new messages and feedback updates
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

  const handleFeedback = async (timestamp: string, type: "like" | "dislike") => {
    console.log('💬 Handling feedback in conversation view:', { timestamp, type });
    
    // Find the message by timestamp
    const message = messages.find(msg => msg.timestamp === timestamp);
    if (!message || !message.id) {
      console.log('⚠️ Message not found or no ID available');
      return;
    }

    try {
      const newFeedback = message.feedback === type ? null : type;
      
      console.log('💾 Updating feedback in database:', { messageId: message.id, newFeedback });
      const success = await analyticsService.updateMessageFeedback(message.id, newFeedback);
      
      if (success) {
        console.log('✅ Feedback updated successfully in database');
        
        // Update local state immediately for better UX
        setMessages(prev => prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, feedback: newFeedback as 'like' | 'dislike' | undefined }
            : msg
        ));
        
        toast({
          description: newFeedback ? `Feedback ${type === 'like' ? 'liked' : 'disliked'}` : "Feedback removed",
          duration: 2000,
        });
      } else {
        console.error('❌ Failed to update feedback in database');
        toast({
          description: "Failed to update feedback",
          duration: 2000,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error updating feedback:', error);
      toast({
        description: "Failed to update feedback",
        duration: 2000,
        variant: "destructive"
      });
    }
  };

  const handleCopy = (content: string) => {
    // Copy functionality is disabled in read-only mode
    console.log('Copy disabled in view mode');
  };

  const userMessageStyle = userMessageColor ? {
    backgroundColor: userMessageColor,
    color: getContrastColor(userMessageColor)
  } : {};

  const handleDeleteConfirm = (onDelete: () => void) => {
    onDelete();
    setShowDeleteDialog(false);
  };

  return {
    showDeleteDialog,
    setShowDeleteDialog,
    messages,
    isLoading,
    handleFeedback,
    handleCopy,
    userMessageStyle,
    handleDeleteConfirm
  };
};
