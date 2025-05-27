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
  feedback?: 'like' | 'dislike' | null;
}

// Helper function to safely type-guard feedback values
const validateFeedback = (feedback: any): 'like' | 'dislike' | null => {
  if (feedback === 'like' || feedback === 'dislike') {
    return feedback;
  }
  return null;
};

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

    // Apply the same type validation as in getMessages
    const message: Message = {
      id: data.id,
      conversation_id: data.conversation_id,
      content: data.content,
      is_agent: data.is_agent,
      timestamp: data.timestamp,
      created_at: data.created_at,
      feedback: validateFeedback(data.feedback)
    };

    return message;
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

    // Properly type and transform the data with safe feedback validation
    return (data || []).map(msg => {
      const message: Message = {
        id: msg.id,
        conversation_id: msg.conversation_id,
        content: msg.content,
        is_agent: msg.is_agent,
        timestamp: msg.timestamp,
        created_at: msg.created_at,
        feedback: validateFeedback(msg.feedback)
      };
      return message;
    });
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
