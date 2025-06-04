
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

interface SourceStats {
  totalSources: number;
  totalBytes: number;
  sourcesByType: Record<string, { count: number; size: number }>;
  requiresTraining: boolean;
  unprocessedCrawledPages: number;
}

export const useAgentSourceStats = () => {
  const { agentId } = useParams();

  return useQuery({
    queryKey: ['agent-source-stats', agentId],
    queryFn: async (): Promise<SourceStats> => {
      if (!agentId) {
        throw new Error('Agent ID is required');
      }

      // Get source stats using the existing function
      const { data: stats, error: statsError } = await supabase
        .rpc('get_agent_source_stats', { target_agent_id: agentId });

      if (statsError) {
        console.error('Error fetching source stats:', statsError);
        throw statsError;
      }

      const result = stats?.[0];
      if (!result) {
        return {
          totalSources: 0,
          totalBytes: 0,
          sourcesByType: {},
          requiresTraining: false,
          unprocessedCrawledPages: 0
        };
      }

      // Check if any sources require manual training
      const { data: sourcesNeedingTraining, error: trainingError } = await supabase
        .from('agent_sources')
        .select('id, requires_manual_training')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .eq('requires_manual_training', true);

      if (trainingError) {
        console.error('Error checking training requirements:', trainingError);
      }

      // Count unprocessed crawled pages
      const { data: unprocessedPages, error: pagesError } = await supabase
        .from('source_pages')
        .select('id, parent_source_id')
        .eq('status', 'completed')
        .eq('processing_status', 'pending')
        .in('parent_source_id', 
          sourcesNeedingTraining?.map(s => s.id) || []
        );

      if (pagesError) {
        console.error('Error counting unprocessed pages:', pagesError);
      }

      const requiresTraining = (sourcesNeedingTraining?.length || 0) > 0;
      const unprocessedCrawledPages = unprocessedPages?.length || 0;

      // Parse sources_by_type JSON safely
      let sourcesByType = {};
      try {
        if (result.sources_by_type && typeof result.sources_by_type === 'object') {
          sourcesByType = result.sources_by_type as Record<string, { count: number; size: number }>;
        }
      } catch (error) {
        console.error('Error parsing sources_by_type:', error);
      }

      console.log('📊 Source stats calculated:', {
        totalSources: result.total_sources,
        totalBytes: result.total_bytes,
        sourcesByType,
        requiresTraining,
        unprocessedCrawledPages
      });

      return {
        totalSources: result.total_sources,
        totalBytes: result.total_bytes,
        sourcesByType,
        requiresTraining,
        unprocessedCrawledPages
      };
    },
    enabled: !!agentId,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });
};
