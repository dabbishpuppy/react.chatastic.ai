
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource, SourceType } from '@/types/rag';
import { useParams } from 'react-router-dom';

interface PaginatedSourcesResult {
  sources: AgentSource[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

interface UseSourcesPaginatedOptions {
  sourceType?: SourceType;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export const useSourcesPaginated = (options: UseSourcesPaginatedOptions = {}) => {
  const { agentId } = useParams();
  const {
    sourceType,
    page = 1,
    pageSize = 10,
    enabled = true
  } = options;

  const [currentPage, setCurrentPage] = useState(page);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const query = useQuery({
    queryKey: ['agent-sources-paginated', agentId, sourceType, currentPage, searchQuery, sortBy, sortOrder],
    queryFn: async (): Promise<PaginatedSourcesResult> => {
      if (!agentId) return { sources: [], totalCount: 0, totalPages: 0, currentPage: 1 };

      let query = supabase
        .from('agent_sources')
        .select(`
          *,
          metadata,
          content,
          raw_text,
          avg_compression_ratio,
          children_completed,
          children_failed,
          children_pending,
          discovery_completed,
          original_size,
          compressed_size,
          compression_ratio,
          global_compression_ratio,
          total_content_size,
          compressed_content_size,
          unique_chunks,
          duplicate_chunks,
          total_children,
          requires_manual_training,
          is_excluded,
          links_count
        `, { count: 'exact' })
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      const { data: sources, error, count } = await query;

      if (error) {
        console.error('Error fetching paginated sources:', error);
        throw error;
      }

      const processedSources = (sources || []).map(source => ({
        ...source,
        metadata: source.metadata as Record<string, any> || {},
        requires_manual_training: source.requires_manual_training || false,
        is_excluded: source.is_excluded || false,
        links_count: source.links_count || 0
      })) as AgentSource[];

      return {
        sources: processedSources,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage
      };
    },
    enabled: !!agentId && enabled,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data,
    sources: query.data?.sources || [],
    total: query.data?.totalCount || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    currentPage,
    totalPages: query.data?.totalPages || Math.ceil((query.data?.totalCount || 0) / pageSize),
    goToPage,
    goToNextPage,
    goToPreviousPage,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    pageSize
  };
};

// Convenience hooks for specific source types
export const useTextSourcesPaginated = (page: number = 1, pageSize: number = 25) => {
  return useSourcesPaginated({ sourceType: 'text', page, pageSize });
};

export const useFileSourcesPaginated = (page: number = 1, pageSize: number = 25) => {
  return useSourcesPaginated({ sourceType: 'file', page, pageSize });
};

export const useWebsiteSourcesPaginated = (page: number = 1, pageSize: number = 25) => {
  return useSourcesPaginated({ sourceType: 'website', page, pageSize });
};

export const useQASourcesPaginated = (page: number = 1, pageSize: number = 25) => {
  return useSourcesPaginated({ sourceType: 'qa', page, pageSize });
};
