
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource, SourceType } from '@/types/rag';

interface PaginatedSourcesOptions {
  sourceType?: SourceType;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

interface SourcesPageResult {
  sources: AgentSource[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// Lightweight source query - excludes content field for performance
const fetchSourcesPage = async (
  agentId: string, 
  sourceType?: SourceType, 
  page = 1,
  pageSize = 25
): Promise<SourcesPageResult> => {
  console.log(`🔍 Fetching sources page: agentId=${agentId}, type=${sourceType}, page=${page}, size=${pageSize}`);
  
  // For website sources, we need ALL sources (parents + children) to build the tree structure
  // But we'll paginate based on parent sources only
  if (sourceType === 'website') {
    // First get all website sources for this agent (we need children to build the tree)
    let allSourcesQuery = supabase
      .from('agent_sources')
      .select(`
        id, title, source_type, url, created_at, updated_at, 
        metadata, is_active, parent_source_id, crawl_status, 
        progress, links_count, last_crawled_at, is_excluded,
        agent_id, team_id, created_by, updated_by, file_path,
        extraction_method, content_summary, content, raw_text,
        compression_ratio, keywords, original_size, compressed_size
      `)
      .eq('agent_id', agentId)
      .eq('source_type', 'website')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const { data: allSources, error: allSourcesError } = await allSourcesQuery;

    if (allSourcesError) {
      console.error('❌ Error fetching all website sources:', allSourcesError);
      throw allSourcesError;
    }

    console.log(`✅ Fetched ${allSources?.length || 0} total website sources`);
    
    // Count parent sources for pagination
    const parentSources = (allSources || []).filter(source => !source.parent_source_id);
    const totalParentCount = parentSources.length;
    const totalPages = Math.ceil(totalParentCount / pageSize);
    
    console.log(`📊 Website sources summary:`, {
      totalSources: allSources?.length || 0,
      parentSources: totalParentCount,
      childSources: (allSources?.length || 0) - totalParentCount,
      page,
      totalPages
    });

    // Cast the data to AgentSource[] to handle the metadata type mismatch
    const typedSources: AgentSource[] = (allSources || []).map(source => ({
      ...source,
      metadata: source.metadata as Record<string, any>
    }));

    return {
      sources: typedSources,
      totalCount: allSources?.length || 0,
      totalPages,
      currentPage: page,
      pageSize
    };
  }

  // For other source types, use the original pagination logic
  const offset = (page - 1) * pageSize;

  // First get the total count
  let countQuery = supabase
    .from('agent_sources')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .eq('is_active', true);

  if (sourceType) {
    countQuery = countQuery.eq('source_type', sourceType);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error('❌ Error fetching sources count:', countError);
    throw countError;
  }

  // Then get the actual data
  let dataQuery = supabase
    .from('agent_sources')
    .select(`
      id, title, source_type, url, created_at, updated_at, 
      metadata, is_active, parent_source_id, crawl_status, 
      progress, links_count, last_crawled_at, is_excluded,
      agent_id, team_id, created_by, updated_by, file_path,
      extraction_method, content_summary, content, raw_text,
      compression_ratio, keywords, original_size, compressed_size
    `)
    .eq('agent_id', agentId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (sourceType) {
    dataQuery = dataQuery.eq('source_type', sourceType);
  }

  const { data, error } = await dataQuery;

  if (error) {
    console.error('❌ Error fetching sources page:', error);
    throw error;
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  console.log(`✅ Fetched ${data?.length || 0} sources, page ${page} of ${totalPages}`);
  
  // Cast the data to AgentSource[] to handle the metadata type mismatch
  const typedSources: AgentSource[] = (data || []).map(source => ({
    ...source,
    metadata: source.metadata as Record<string, any>
  }));
  
  return {
    sources: typedSources,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize
  };
};

export const useSourcesPaginated = (options: PaginatedSourcesOptions = {}) => {
  const { agentId } = useParams();
  const { sourceType, page = 1, pageSize = 25, enabled = true } = options;

  return useQuery({
    queryKey: ['sources-paginated', agentId, sourceType, page, pageSize],
    queryFn: () => fetchSourcesPage(agentId!, sourceType, page, pageSize),
    enabled: !!agentId && enabled,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
};

// Convenience hooks for specific source types
export const useFileSourcesPaginated = (page = 1, pageSize = 25) => 
  useSourcesPaginated({ sourceType: 'file', page, pageSize });

export const useWebsiteSourcesPaginated = (page = 1, pageSize = 25) => 
  useSourcesPaginated({ sourceType: 'website', page, pageSize });

export const useTextSourcesPaginated = (page = 1, pageSize = 25) => 
  useSourcesPaginated({ sourceType: 'text', page, pageSize });

export const useQASourcesPaginated = (page = 1, pageSize = 25) => 
  useSourcesPaginated({ sourceType: 'qa', page, pageSize });
