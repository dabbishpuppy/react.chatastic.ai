
import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "./types";

export const conversationOperations = {
  // Create a new conversation
  async createConversation(agentId: string, sessionId: string, source: 'iframe' | 'bubble'): Promise<Conversation | null> {
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
  },

  // End a conversation
  async endConversation(conversationId: string): Promise<boolean> {
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
  },

  // Get recent conversations for an agent (only those with messages)
  async getRecentConversations(agentId: string, limit: number = 10): Promise<Conversation[]> {
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
  },

  // Get conversation by ID
  async getConversationById(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }

    return data as Conversation;
  },

  // Update conversation title
  async updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating conversation title:', error);
      return false;
    }

    return true;
  },

  // Generate title from first message
  generateConversationTitle(firstMessage: string): string {
    const words = firstMessage.trim().split(' ');
    if (words.length <= 6) return firstMessage;
    return words.slice(0, 6).join(' ') + '...';
  },

  // Delete conversation using the database function
  async deleteConversation(conversationId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('delete_conversation', { conversation_id: conversationId });

    if (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }

    return data === true;
  }
};
