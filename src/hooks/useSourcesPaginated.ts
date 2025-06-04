import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource } from '@/types/rag';

interface PaginatedSources {
  sources: AgentSource[];
  total: number;
}

export const useSourcesPaginated = (
  agentId: string,
  currentTab: string,
  pageSize: number = 10
) => {
  const [currentPage, setCurrentPage] = useState(1);
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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['agent-sources-paginated', agentId, currentTab, currentPage, searchQuery, sortBy, sortOrder],
    queryFn: async () => {
      if (!agentId) return { sources: [], total: 0 };

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
          requires_manual_training
        `, { count: 'exact' })
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (currentTab !== 'all') {
        query = query.eq('source_type', currentTab);
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
        requires_manual_training: source.requires_manual_training || false
      })) as AgentSource[];

      return {
        sources: processedSources,
        total: count || 0
      };
    },
    enabled: !!agentId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return {
    sources: data?.sources || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch,
    currentPage,
    totalPages: Math.ceil((data?.total || 0) / pageSize),
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
