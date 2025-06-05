
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

interface AgentSourceStats {
  totalSources: number;
  totalBytes: number;
  sourcesByType: Record<string, { count: number; size: number }>;
  requiresTraining: boolean;
  unprocessedCrawledPages: number;
}

const fetchAgentSourceStats = async (agentId: string): Promise<AgentSourceStats> => {
  // Get all active sources for this agent
  const { data: sources, error: sourcesError } = await supabase
    .from('agent_sources')
    .select('id, source_type, metadata, requires_manual_training')
    .eq('agent_id', agentId)
    .eq('is_active', true);

  if (sourcesError) {
    throw new Error(`Failed to fetch sources: ${sourcesError.message}`);
  }

  // Check for unprocessed crawled pages
  const { data: unprocessedPages, error: pagesError } = await supabase
    .from('source_pages')
    .select('id')
    .eq('status', 'completed')
    .in('processing_status', ['pending', null]);

  if (pagesError) {
    console.warn('Failed to fetch unprocessed pages:', pagesError);
  }

  const unprocessedCrawledPages = unprocessedPages?.length || 0;

  // Check if any source requires manual training
  const requiresTraining = sources?.some(source => source.requires_manual_training === true) || unprocessedCrawledPages > 0;

  // Calculate stats by type
  const sourcesByType: Record<string, { count: number; size: number }> = {
    text: { count: 0, size: 0 },
    file: { count: 0, size: 0 },
    website: { count: 0, size: 0 },
    qa: { count: 0, size: 0 }
  };

  let totalBytes = 0;

  sources?.forEach(source => {
    const type = source.source_type;
    if (sourcesByType[type]) {
      sourcesByType[type].count++;
      
      // Get size from metadata if available
      const metadata = source.metadata as any;
      const size = metadata?.file_size || metadata?.content_size || 0;
      sourcesByType[type].size += size;
      totalBytes += size;
    }
  });

  // For website sources, also get size from completed pages
  if (sourcesByType.website.count > 0) {
    const { data: websitePages, error: websitePagesError } = await supabase
      .from('source_pages')
      .select('content_size, compression_ratio')
      .eq('status', 'completed')
      .not('content_size', 'is', null);

    if (!websitePagesError && websitePages) {
      let websiteSize = 0;
      websitePages.forEach(page => {
        const size = page.compression_ratio ? 
          Math.round(page.content_size * page.compression_ratio) : 
          page.content_size;
        websiteSize += size || 0;
      });
      
      sourcesByType.website.size = websiteSize;
      // Recalculate total bytes
      totalBytes = Object.values(sourcesByType).reduce((sum, type) => sum + type.size, 0);
    }
  }

  return {
    totalSources: sources?.length || 0,
    totalBytes,
    sourcesByType,
    requiresTraining,
    unprocessedCrawledPages
  };
};

export const useAgentSourceStats = () => {
  const { agentId } = useParams();
  
  return useQuery({
    queryKey: ['agent-source-stats', agentId],
    queryFn: () => fetchAgentSourceStats(agentId!),
    enabled: !!agentId,
    refetchInterval: 5000, // Refetch every 5 seconds to catch updates
  });
};
