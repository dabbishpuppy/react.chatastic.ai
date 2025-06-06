
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

interface SourcePage {
  id: string;
  url: string;
  status: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  content_size?: number;
  chunks_created?: number;
  processing_time_ms?: number;
  parent_source_id: string;
  compression_ratio?: number;
}

interface UseSourcePagesPaginatedProps {
  parentSourceId?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export const useSourcePagesPaginated = ({
  parentSourceId,
  page = 1,
  pageSize = 25,
  enabled = true
}: UseSourcePagesPaginatedProps) => {
  const { agentId } = useParams();

  return useQuery({
    queryKey: ['source-pages', agentId, parentSourceId, page, pageSize],
    queryFn: async () => {
      if (!parentSourceId) {
        return { pages: [], totalCount: 0, totalPages: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('source_pages')
        .select('*', { count: 'exact' })
        .eq('parent_source_id', parentSourceId)
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) {
        console.error('Error fetching source pages:', error);
        throw error;
      }

      return {
        pages: (data || []) as SourcePage[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    enabled: enabled && !!parentSourceId && !!agentId,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });
};
