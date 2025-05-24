
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/types/chatInterface";

export interface Conversation {
  id: string;
  agent_id: string;
  session_id: string;
  title: string | null;
  status: 'active' | 'ended';
  source: 'iframe' | 'bubble';
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  is_agent: boolean;
  timestamp: string;
  created_at: string;
}

export const conversationService = {
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

    return data;
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

  // Get recent conversations for an agent
  async getRecentConversations(agentId: string, limit: number = 10): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('agent_id', agentId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    return data || [];
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

    return data;
  },

  // Add message to conversation
  async addMessage(conversationId: string, content: string, isAgent: boolean): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: content,
        is_agent: isAgent,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      return null;
    }

    return data;
  },

  // Get messages for a conversation
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data || [];
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
  }
};
