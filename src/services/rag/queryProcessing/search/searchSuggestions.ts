
import { supabase } from '@/integrations/supabase/client';

export class SearchSuggestions {
  static async getSearchSuggestions(
    partialQuery: string,
    agentId: string,
    limit: number = 5
  ): Promise<string[]> {
    console.log('💡 Getting search suggestions:', { partialQuery });

    try {
      // Get recent successful queries for this agent from messages table
      const { data: recentQueries } = await supabase
        .from('messages')
        .select('content, conversations!inner(agent_id)')
        .eq('conversations.agent_id', agentId)
        .eq('is_agent', false)
        .ilike('content', `%${partialQuery}%`)
        .limit(limit * 2);

      if (!recentQueries) return [];

      // Filter and format suggestions
      const suggestions = recentQueries
        .map(q => q.content as string)
        .filter(content => 
          typeof content === 'string' &&
          content.length > partialQuery.length && 
          content.length < 100 &&
          content.toLowerCase().includes(partialQuery.toLowerCase())
        )
        .slice(0, limit);

      return [...new Set(suggestions)]; // Remove duplicates

    } catch (error) {
      console.error('❌ Failed to get search suggestions:', error);
      return [];
    }
  }
}
