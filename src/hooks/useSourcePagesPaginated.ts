
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
}

interface UseSourcePagesPaginatedOptions {
  parentSourceId: string;
  page: number;
  pageSize: number;
  enabled?: boolean;
}

interface PaginatedPagesResult {
  pages: SourcePage[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export const useSourcePagesPaginated = ({
  parentSourceId,
  page,
  pageSize,
  enabled = true
}: UseSourcePagesPaginatedOptions) => {
  return useQuery({
    queryKey: ['source-pages-paginated', parentSourceId, page, pageSize],
    queryFn: async (): Promise<PaginatedPagesResult> => {
      console.log('🔍 Fetching source pages:', {
        parentSourceId,
        page,
        pageSize,
        enabled
      });

      if (!parentSourceId) {
        throw new Error('Parent source ID is required');
      }

      const offset = (page - 1) * pageSize;
      
      const { data, error, count } = await supabase
        .from('source_pages')
        .select('*', { count: 'exact' })
        .eq('parent_source_id', parentSourceId)
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('❌ Error fetching source pages:', error);
        throw error;
      }

      console.log('📋 Source pages fetched:', {
        count: data?.length || 0,
        totalCount: count || 0,
        parentSourceId
      });

      const totalPages = Math.ceil((count || 0) / pageSize);

      return {
        pages: data || [],
        totalCount: count || 0,
        totalPages,
        currentPage: page
      };
    },
    enabled: enabled && !!parentSourceId,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0, // Always fetch fresh data
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
  });
};
