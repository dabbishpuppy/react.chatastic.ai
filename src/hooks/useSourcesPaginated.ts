
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource } from '@/types/rag';
import { useParams } from 'react-router-dom';

interface UseSourcesPaginatedOptions {
  sourceType?: string;
  page: number;
  pageSize: number;
  enabled?: boolean;
}

interface PaginatedSourcesResult {
  sources: AgentSource[];
  totalCount: number;
  totalPages: number;
}

export const useSourcesPaginated = ({
  sourceType,
  page,
  pageSize,
  enabled = true
}: UseSourcesPaginatedOptions) => {
  const { agentId } = useParams();

  return useQuery({
    queryKey: ['sources-paginated', agentId, sourceType, page, pageSize],
    queryFn: async (): Promise<PaginatedSourcesResult> => {
      if (!agentId) {
        throw new Error('Agent ID is required');
      }

      // Build base query - exclude hard deleted sources (is_excluded without pending_deletion)
      let query = supabase
        .from('agent_sources')
        .select('*', { count: 'exact' })
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .or('is_excluded.eq.false,and(is_excluded.eq.true,pending_deletion.eq.true)'); // Include non-excluded OR (excluded AND pending deletion)

      // Add source type filter if specified
      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }

      // Add pagination
      const offset = (page - 1) * pageSize;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching paginated sources:', error);
        throw error;
      }

      const totalPages = Math.ceil((count || 0) / pageSize);

      return {
        sources: data || [],
        totalCount: count || 0,
        totalPages
      };
    },
    enabled: enabled && !!agentId,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 30000, // 30 seconds
  });
};
