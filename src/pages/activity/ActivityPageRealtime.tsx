
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation as DBConversation, conversationService } from "@/services/conversationService";

interface UseActivityRealtimeProps {
  agentId: string | undefined;
  conversations: DBConversation[];
  loadConversations: () => Promise<void>;
}

export const useActivityRealtime = ({
  agentId,
  conversations,
  loadConversations
}: UseActivityRealtimeProps) => {
  // Real-time subscription for messages
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('Real-time message update:', payload);
          
          // Check if this message belongs to a conversation for our current agent
          if (payload.new && typeof payload.new === 'object' && 'conversation_id' in payload.new) {
            const messageConversationId = payload.new.conversation_id;
            
            // First check if this conversation belongs to our current conversations
            const belongsToCurrentConversations = conversations.some(conv => conv.id === messageConversationId);
            
            if (belongsToCurrentConversations) {
              console.log('Message belongs to current conversations, refreshing list');
              await loadConversations();
              return;
            }
            
            // If not in current list, verify it belongs to the current agent before processing
            try {
              const conversation = await conversationService.getConversationById(messageConversationId);
              if (conversation && conversation.agent_id === agentId) {
                console.log('New conversation detected for current agent, refreshing list');
                await loadConversations();
              } else {
                console.log('Message belongs to different agent or conversation not found, ignoring');
              }
            } catch (error) {
              console.warn('Could not verify conversation ownership for real-time message:', error);
            }
          } else {
            // For other changes, just refresh the conversations list
            console.log('Non-message change detected, refreshing conversations');
            await loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, conversations, loadConversations]);
};
