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

      console.log('🔍 DEBUG: Fetching paginated sources:', {
        agentId,
        sourceType,
        page,
        pageSize,
        timestamp: new Date().toISOString()
      });

      // Build base query - include ALL sources including pending deletion
      // CRITICAL: Only filter by is_active=true, DO NOT filter by pending_deletion or is_excluded
      let query = supabase
        .from('agent_sources')
        .select('*', { count: 'exact' })
        .eq('agent_id', agentId)
        .eq('is_active', true); // Only filter by is_active, keep everything else including pending_deletion

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
        console.error('❌ DEBUG: Error fetching paginated sources:', error);
        throw error;
      }

      console.log('📋 DEBUG: Raw sources fetched from database:', {
        count: data?.length || 0,
        totalCount: count || 0,
        sources: data?.map(s => ({
          id: s.id,
          title: s.title,
          is_active: s.is_active,
          pending_deletion: s.pending_deletion,
          is_excluded: s.is_excluded,
          source_type: s.source_type,
          parent_source_id: s.parent_source_id
        })) || [],
        timestamp: new Date().toISOString()
      });

      const sourcesWithPendingDeletion = data?.filter(s => s.pending_deletion === true) || [];
      const sourcesExcluded = data?.filter(s => s.is_excluded === true) || [];
      
      console.log('📊 DEBUG: Sources breakdown:', {
        total: data?.length || 0,
        withPendingDeletion: sourcesWithPendingDeletion.length,
        excluded: sourcesExcluded.length,
        pendingDeletionSources: sourcesWithPendingDeletion.map(s => ({
          id: s.id,
          title: s.title,
          pending_deletion: s.pending_deletion
        })),
        timestamp: new Date().toISOString()
      });

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
        file_type: undefined,
      }));

      console.log('📤 DEBUG: Transformed sources being returned:', {
        count: sources.length,
        sourcesWithPendingDeletion: sources.filter(s => s.pending_deletion === true).length,
        sourcesExcluded: sources.filter(s => s.is_excluded === true).length,
        timestamp: new Date().toISOString()
      });

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
    staleTime: 0, // INSTANT FEEDBACK: No stale time - rely on optimistic updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    // REMOVED refetchInterval - rely on WebSocket events and cache updates instead
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
