
import { useInfiniteQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource, SourceType } from '@/types/rag';

interface PaginatedSourcesOptions {
  sourceType?: SourceType;
  pageSize?: number;
}

interface SourcesPage {
  sources: AgentSource[];
  nextCursor?: string;
  hasMore: boolean;
}

// Lightweight source query - excludes content field for performance
const fetchSourcesPage = async (
  agentId: string, 
  sourceType?: SourceType, 
  cursor?: string,
  pageSize = 25
): Promise<SourcesPage> => {
  console.log(`🔍 Fetching sources page: type=${sourceType}, cursor=${cursor}, size=${pageSize}`);
  
  let query = supabase
    .from('agent_sources')
    .select(`
      id, title, source_type, url, created_at, updated_at, 
      metadata, is_active, parent_source_id, crawl_status, 
      progress, links_count, last_crawled_at, is_excluded
    `)
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(pageSize + 1); // Fetch one extra to check if there are more

  if (sourceType) {
    query = query.eq('source_type', sourceType);
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching sources page:', error);
    throw error;
  }

  const sources = data || [];
  const hasMore = sources.length > pageSize;
  const pageData = hasMore ? sources.slice(0, pageSize) : sources;
  const nextCursor = hasMore ? pageData[pageData.length - 1]?.created_at : undefined;

  console.log(`✅ Fetched ${pageData.length} sources, hasMore: ${hasMore}`);
  
  return {
    sources: pageData as AgentSource[],
    nextCursor,
    hasMore
  };
};

export const useSourcesPaginated = (options: PaginatedSourcesOptions = {}) => {
  const { agentId } = useParams();
  const { sourceType, pageSize = 25 } = options;

  return useInfiniteQuery<SourcesPage, Error>({
    queryKey: ['sources-paginated', agentId, sourceType],
    queryFn: ({ pageParam }) => fetchSourcesPage(agentId!, sourceType, pageParam as string, pageSize),
    getNextPageParam: (lastPage: SourcesPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined,
    enabled: !!agentId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
};

// Convenience hooks for specific source types
export const useFileSourcesPaginated = () => useSourcesPaginated({ sourceType: 'file' });
export const useWebsiteSourcesPaginated = () => useSourcesPaginated({ sourceType: 'website' });
export const useTextSourcesPaginated = () => useSourcesPaginated({ sourceType: 'text' });
export const useQASourcesPaginated = () => useSourcesPaginated({ sourceType: 'qa' });
