
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
      console.log('🔍 Analytics service called with:', { agentId, startDate, endDate });

      // Get total conversations (chats) for the agent
      let conversationsQuery = supabase
        .from('conversations')
        .select('id', { count: 'exact' })
        .eq('agent_id', agentId);

      if (startDate) {
        conversationsQuery = conversationsQuery.gte('created_at', startDate);
      }
      if (endDate) {
        conversationsQuery = conversationsQuery.lte('created_at', endDate);
      }

      const { data: conversationsData, error: conversationsError, count: totalChats } = await conversationsQuery;

      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
        throw conversationsError;
      }

      console.log('📊 Conversations found:', totalChats);

      // Get total messages for the agent's conversations
      let messagesQuery = supabase
        .from('messages')
        .select(`
          id,
          feedback,
          conversations!inner(agent_id, created_at)
        `, { count: 'exact' })
        .eq('conversations.agent_id', agentId);

      if (startDate) {
        messagesQuery = messagesQuery.gte('conversations.created_at', startDate);
      }
      if (endDate) {
        messagesQuery = messagesQuery.lte('conversations.created_at', endDate);
      }

      const { data: messagesData, error: messagesError, count: totalMessages } = await messagesQuery;

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      console.log('📊 Messages found:', totalMessages, 'Message data:', messagesData);

      const thumbsUp = messagesData?.filter(msg => msg.feedback === 'like').length || 0;
      const thumbsDown = messagesData?.filter(msg => msg.feedback === 'dislike').length || 0;

      const result = {
        totalChats: totalChats || 0,
        totalMessages: totalMessages || 0,
        thumbsUp,
        thumbsDown
      };

      console.log('📊 Final analytics result:', result);

      return result;
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
