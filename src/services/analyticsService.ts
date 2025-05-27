
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsData {
  totalChats: number;
  totalMessages: number;
  thumbsUp: number;
  thumbsDown: number;
}

export const analyticsService = {
  // Get analytics data for a specific agent with optional date filtering
  async getAnalyticsData(
    agentId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<AnalyticsData> {
    try {
      // Build date filter condition
      let dateFilter = '';
      if (startDate && endDate) {
        dateFilter = `AND conversations.created_at >= '${startDate}' AND conversations.created_at <= '${endDate}'`;
      }

      // Get total conversations (chats) for the agent
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id', { count: 'exact' })
        .eq('agent_id', agentId)
        .gte('created_at', startDate || '1900-01-01')
        .lte('created_at', endDate || '2100-01-01');

      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
        throw conversationsError;
      }

      const totalChats = conversationsData?.length || 0;

      // Get total messages for the agent's conversations
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          feedback,
          conversations!inner(agent_id, created_at)
        `, { count: 'exact' })
        .eq('conversations.agent_id', agentId)
        .gte('conversations.created_at', startDate || '1900-01-01')
        .lte('conversations.created_at', endDate || '2100-01-01');

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      const totalMessages = messagesData?.length || 0;
      const thumbsUp = messagesData?.filter(msg => msg.feedback === 'like').length || 0;
      const thumbsDown = messagesData?.filter(msg => msg.feedback === 'dislike').length || 0;

      return {
        totalChats,
        totalMessages,
        thumbsUp,
        thumbsDown
      };
    } catch (error) {
      console.error('Error in getAnalyticsData:', error);
      return {
        totalChats: 0,
        totalMessages: 0,
        thumbsUp: 0,
        thumbsDown: 0
      };
    }
  },

  // Update message feedback
  async updateMessageFeedback(messageId: string, feedback: 'like' | 'dislike' | null): Promise<boolean> {
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
  }
};
