
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/types/chatInterface";

export interface DatabaseMessage {
  id: string;
  conversation_id: string;
  content: string;
  is_agent: boolean;
  timestamp: string;
  created_at: string;
  feedback?: 'like' | 'dislike' | null;
}

export const messageService = {
  // Save a message to the database and return the saved message with ID
  async saveMessage(
    conversationId: string, 
    content: string, 
    isAgent: boolean
  ): Promise<DatabaseMessage | null> {
    try {
      const timestamp = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: content,
          is_agent: isAgent,
          timestamp: timestamp
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving message:', error);
        return null;
      }

      return data as DatabaseMessage;
    } catch (error) {
      console.error('Error in saveMessage:', error);
      return null;
    }
  },

  // Update message feedback
  async updateMessageFeedback(
    messageId: string, 
    feedback: 'like' | 'dislike' | null
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ feedback })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message feedback:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateMessageFeedback:', error);
      return false;
    }
  },

  // Get messages for a conversation
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      // Convert database messages to ChatMessage format
      return data.map(msg => ({
        id: msg.id,
        content: msg.content,
        isAgent: msg.is_agent,
        timestamp: msg.timestamp,
        feedback: msg.feedback as 'like' | 'dislike' | undefined
      }));
    } catch (error) {
      console.error('Error in getMessages:', error);
      return [];
    }
  }
};
