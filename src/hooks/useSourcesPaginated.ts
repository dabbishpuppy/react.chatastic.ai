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

// Type for optimized source data (including all new fields)
interface OptimizedSourceData {
  id: string;
  title: string;
  source_type: SourceType;
  url: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  is_active: boolean;
  parent_source_id: string | null;
  crawl_status: string | null;
  progress: number | null;
  links_count: number | null;
  last_crawled_at: string | null;
  is_excluded: boolean | null;
  agent_id: string;
  team_id: string;
  created_by: string | null;
  updated_by: string | null;
  file_path: string | null;
  extraction_method: string | null;
  content_summary: string | null;
  keywords: string[] | null;
  compression_ratio: number | null;
  original_size: number | null;
  compressed_size: number | null;
  // New industrial-scale crawling fields
  total_jobs: number | null;
  completed_jobs: number | null;
  failed_jobs: number | null;
  exclude_paths: string[] | null;
  include_paths: string[] | null;
  respect_robots: boolean | null;
  max_concurrent_jobs: number | null;
  total_content_size: number | null;
  compressed_content_size: number | null;
  unique_chunks: number | null;
  duplicate_chunks: number | null;
  global_compression_ratio: number | null;
  // Parent-child tracking fields
  total_children: number | null;
  children_completed: number | null;
  children_failed: number | null;
  children_pending: number | null;
  discovery_completed: boolean | null;
  avg_compression_ratio: number | null;
  total_processing_time_ms: number | null;
}

// Optimized source query - excludes heavy content fields for performance
const fetchSourcesPage = async (
  agentId: string, 
  sourceType?: SourceType, 
  page = 1,
  pageSize = 25
): Promise<SourcesPageResult> => {
  console.log(`🔍 Fetching sources page: agentId=${agentId}, type=${sourceType}, page=${page}, size=${pageSize}`);
  
  // Build the select query with all necessary fields
  const selectFields = `
    id, title, source_type, url, created_at, updated_at, 
    metadata, is_active, parent_source_id, crawl_status, 
    progress, links_count, last_crawled_at, is_excluded,
    agent_id, team_id, created_by, updated_by, file_path,
    extraction_method, content_summary, keywords, 
    compression_ratio, original_size, compressed_size,
    total_jobs, completed_jobs, failed_jobs, exclude_paths,
    include_paths, respect_robots, max_concurrent_jobs,
    total_content_size, compressed_content_size, unique_chunks,
    duplicate_chunks, global_compression_ratio,
    total_children, children_completed, children_failed, children_pending, discovery_completed, avg_compression_ratio, total_processing_time_ms
  `;
  
  // For website sources, implement proper pagination for parent sources only
  if (sourceType === 'website') {
    // First get count of parent sources for pagination
    const { count: parentCount, error: countError } = await supabase
      .from('agent_sources')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('source_type', 'website')
      .eq('is_active', true)
      .is('parent_source_id', null);

    if (countError) {
      console.error('❌ Error fetching parent sources count:', countError);
      throw countError;
    }

    const totalParentCount = parentCount || 0;
    const totalPages = Math.ceil(totalParentCount / pageSize);
    const offset = (page - 1) * pageSize;

    // Fetch only parent sources for this page (no heavy content fields)
    const { data: parentSources, error: parentError } = await supabase
      .from('agent_sources')
      .select(selectFields)
      .eq('agent_id', agentId)
      .eq('source_type', 'website')
      .eq('is_active', true)
      .is('parent_source_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (parentError) {
      console.error('❌ Error fetching parent sources:', parentError);
      throw parentError;
    }

    // For each parent source, also fetch its children (but still no heavy content)
    const allSources: OptimizedSourceData[] = [...(parentSources || [])];
    
    if (parentSources && parentSources.length > 0) {
      const parentIds = parentSources.map(p => p.id);
      
      const { data: childSources, error: childError } = await supabase
        .from('agent_sources')
        .select(selectFields)
        .in('parent_source_id', parentIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!childError && childSources) {
        allSources.push(...childSources);
      }
    }

    console.log(`✅ Fetched ${parentSources?.length || 0} parent sources and ${allSources.length - (parentSources?.length || 0)} child sources`);
    
    // Convert optimized data to AgentSource format
    const typedSources: AgentSource[] = allSources.map(source => ({
      ...source,
      metadata: source.metadata as Record<string, any>,
      content: null, // Not fetched for performance
      raw_text: null, // Not fetched for performance
      // Ensure all required fields are present with defaults
      avg_compression_ratio: source.avg_compression_ratio || 0,
      children_completed: source.children_completed || 0,
      children_failed: source.children_failed || 0,
      children_pending: source.children_pending || 0,
      discovery_completed: source.discovery_completed || false,
      total_processing_time_ms: source.total_processing_time_ms || 0
    }));

    return {
      sources: typedSources,
      totalCount: allSources.length,
      totalPages,
      currentPage: page,
      pageSize
    };
  }

  // For other source types, use optimized pagination (no heavy content fields)
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

  // Then get the actual data (excluding heavy content fields)
  let dataQuery = supabase
    .from('agent_sources')
    .select(selectFields)
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
  
  // Convert optimized data to AgentSource format with required fields
  const typedSources: AgentSource[] = (data || []).map(source => ({
    ...source,
    metadata: source.metadata as Record<string, any>,
    content: null, // Not fetched for performance
    raw_text: null, // Not fetched for performance
    // Ensure all required fields are present with defaults
    avg_compression_ratio: source.avg_compression_ratio || 0,
    children_completed: source.children_completed || 0,
    children_failed: source.children_failed || 0,
    children_pending: source.children_pending || 0,
    discovery_completed: source.discovery_completed || false,
    total_processing_time_ms: source.total_processing_time_ms || 0
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
    retry: (failureCount, error) => {
      // Don't retry on timeout errors, but retry on other errors
      if (error?.message?.includes('timeout') || error?.message?.includes('AbortError')) {
        console.log('⏰ Query timeout - not retrying');
        return false;
      }
      return failureCount < 2;
    },
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
