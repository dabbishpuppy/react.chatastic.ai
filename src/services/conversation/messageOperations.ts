
import { supabase } from "@/integrations/supabase/client";
import { Message, validateFeedback } from "./types";

export const messageOperations = {
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
  }
};
