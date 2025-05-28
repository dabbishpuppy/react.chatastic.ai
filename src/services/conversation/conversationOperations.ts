
import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "./types";

export const conversationOperations = {
  // Create a new conversation
  async createConversation(agentId: string, sessionId: string, source: 'iframe' | 'bubble'): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: agentId,
          session_id: sessionId,
          source: source,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }

      return data as Conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  },

  // End a conversation
  async endConversation(conversationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error ending conversation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error ending conversation:', error);
      return false;
    }
  },

  // Optimized method to get conversations with message counts and previews in a single query
  async getRecentConversationsOptimized(agentId: string, limit: number = 10): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages(count)
        `)
        .eq('agent_id', agentId)
        .gt('messages.count', 0)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching optimized conversations:', error);
        return [];
      }

      return (data || []).filter(conv => conv.messages && conv.messages.length > 0) as Conversation[];
    } catch (error) {
      console.error('Error fetching optimized conversations:', error);
      return [];
    }
  },

  // Get recent conversations for an agent (only those with messages) - legacy method
  async getRecentConversations(agentId: string, limit: number = 10): Promise<Conversation[]> {
    try {
      // First get all conversations for the agent
      const { data: conversations, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agentId)
        .order('updated_at', { ascending: false })
        .limit(limit * 2); // Get more than needed to account for filtering

      if (conversationError) {
        console.error('Error fetching conversations:', conversationError);
        return [];
      }

      if (!conversations || conversations.length === 0) {
        return [];
      }

      // Filter conversations that have at least one message
      const conversationsWithMessages: Conversation[] = [];
      
      for (const conversation of conversations) {
        const { data: messages, error: messageError } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conversation.id)
          .limit(1);

        if (!messageError && messages && messages.length > 0) {
          conversationsWithMessages.push(conversation as Conversation);
          
          // Stop when we have enough conversations
          if (conversationsWithMessages.length >= limit) {
            break;
          }
        }
      }

      return conversationsWithMessages;
    } catch (error) {
      console.error('Error fetching recent conversations:', error);
      return [];
    }
  },

  // Get conversation by ID
  async getConversationById(conversationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - conversation not found
          console.warn(`Conversation not found: ${conversationId}`);
          return null;
        }
        console.error('Error fetching conversation:', error);
        return null;
      }

      return data as Conversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  },

  // Update conversation title
  async updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);

      if (error) {
        console.error('Error updating conversation title:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      return false;
    }
  },

  // Generate title from first message
  generateConversationTitle(firstMessage: string): string {
    const words = firstMessage.trim().split(' ');
    if (words.length <= 6) return firstMessage;
    return words.slice(0, 6).join(' ') + '...';
  },

  // Delete conversation using the database function
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('delete_conversation', { conversation_id: conversationId });

      if (error) {
        console.error('Error deleting conversation:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }
};
