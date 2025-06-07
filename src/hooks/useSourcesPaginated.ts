import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource, SourceType } from '@/types/rag';
import { useParams } from 'react-router-dom';

interface UseSourcesPaginatedOptions {
  sourceType?: SourceType;
  page: number;
  pageSize: number;
  enabled?: boolean;
}

interface PaginatedSourcesResult {
  sources: AgentSource[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
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

      // Transform the data to match AgentSource interface
      const sources: AgentSource[] = (data || []).map(source => ({
        id: source.id,
        agent_id: source.agent_id,
        title: source.title,
        content: source.content || undefined,
        source_type: source.source_type as SourceType,
        url: source.url || undefined,
        file_path: source.file_path || undefined,
        parent_source_id: source.parent_source_id || undefined,
        created_at: source.created_at,
        updated_at: source.updated_at,
        is_active: source.is_active,
        is_excluded: source.is_excluded || undefined,
        pending_deletion: source.pending_deletion || undefined,
        crawl_status: source.crawl_status || undefined,
        progress: source.progress || undefined,
        total_jobs: source.total_jobs || undefined,
        completed_jobs: source.completed_jobs || undefined,
        failed_jobs: source.failed_jobs || undefined,
        last_crawled_at: source.last_crawled_at || undefined,
        discovery_completed: source.discovery_completed || undefined,
        total_children: source.total_children || undefined,
        children_completed: source.children_completed || undefined,
        children_failed: source.children_failed || undefined,
        children_pending: source.children_pending || undefined,
        original_size: source.original_size || undefined,
        compressed_size: source.compressed_size || undefined,
        compression_ratio: source.compression_ratio || undefined,
        global_compression_ratio: source.global_compression_ratio || undefined,
        total_content_size: source.total_content_size || undefined,
        compressed_content_size: source.compressed_content_size || undefined,
        unique_chunks: source.unique_chunks || undefined,
        duplicate_chunks: source.duplicate_chunks || undefined,
        avg_compression_ratio: source.avg_compression_ratio || undefined,
        metadata: typeof source.metadata === 'string' 
          ? JSON.parse(source.metadata) 
          : (source.metadata as Record<string, any>) || {},
        raw_text: source.raw_text || undefined,
        created_by: source.created_by || undefined,
        updated_by: source.updated_by || undefined,
        requires_manual_training: source.requires_manual_training || false,
        links_count: source.links_count || undefined,
        // Set optional properties that don't exist in DB to undefined
        file_type: undefined,
      }));

      return {
        sources,
        totalCount: count || 0,
        totalPages,
        currentPage: page
      };
    },
    enabled: enabled && !!agentId,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 5000, // Reduced stale time for better real-time updates
    refetchInterval: 10000, // Refetch every 10 seconds to catch updates
  });
};

// Backward compatibility wrapper functions
export const useQASourcesPaginated = (page: number, pageSize: number) => {
  return useSourcesPaginated({
    sourceType: 'qa',
    page,
    pageSize
  });
};

export const useTextSourcesPaginated = (page: number, pageSize: number) => {
  return useSourcesPaginated({
    sourceType: 'text',
    page,
    pageSize
  });
};

export const useFileSourcesPaginated = (page: number, pageSize: number) => {
  return useSourcesPaginated({
    sourceType: 'file',
    page,
    pageSize
  });
};
