
import { useEffect, useRef } from "react";
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
  const channelRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);

  // Real-time subscription for messages with debouncing
  useEffect(() => {
    if (!agentId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

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
          
          // Debounce updates to prevent infinite loops
          const now = Date.now();
          if (now - lastUpdateRef.current < 1000) {
            console.log('Debouncing real-time update');
            return;
          }
          lastUpdateRef.current = now;
          
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
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [agentId]); // Only depend on agentId, not conversations or loadConversations to prevent loops
};
