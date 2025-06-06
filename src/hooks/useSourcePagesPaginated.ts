
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';

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

  const query = useQuery({
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
    staleTime: 5 * 1000, // Consider data fresh for 5 seconds only for faster real-time updates
  });

  // Set up real-time subscription for source_pages updates
  useEffect(() => {
    if (!parentSourceId || !enabled) return;

    console.log(`📡 Setting up real-time subscription for source pages of parent: ${parentSourceId}`);

    const channel = supabase
      .channel(`source-pages-realtime-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log(`📄 Source page real-time update:`, payload);
          // Refetch the data when any source page changes
          query.refetch();
        }
      )
      .subscribe((status) => {
        console.log(`📡 Source pages subscription status: ${status}`);
      });

    return () => {
      console.log(`📡 Cleaning up source pages subscription for parent: ${parentSourceId}`);
      supabase.removeChannel(channel);
    };
  }, [parentSourceId, enabled, query]);

  return query;
};
