
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AgentSourceStats {
  totalSources: number;
  totalBytes: number;
  sourcesByType: {
    text: { count: number; size: number };
    file: { count: number; size: number };
    website: { count: number; size: number };
    qa: { count: number; size: number };
  };
}

export const useAgentSourceStats = () => {
  const { agentId } = useParams();
  const [stats, setStats] = useState<AgentSourceStats>({
    totalSources: 0,
    totalBytes: 0,
    sourcesByType: {
      text: { count: 0, size: 0 },
      file: { count: 0, size: 0 },
      website: { count: 0, size: 0 },
      qa: { count: 0, size: 0 }
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!agentId) return;

    try {
      console.log('📊 Fetching agent source stats for:', agentId);
      
      // Get basic source stats
      const { data: sources, error: sourcesError } = await supabase
        .from('agent_sources')
        .select('source_type, content')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (sourcesError) throw sourcesError;

      // Get website source pages total size
      const { data: websiteSourcesWithPages, error: websiteError } = await supabase
        .from('agent_sources')
        .select(`
          id,
          source_type,
          content,
          source_pages!inner(content_size)
        `)
        .eq('agent_id', agentId)
        .eq('source_type', 'website')
        .eq('is_active', true)
        .is('parent_source_id', null);

      if (websiteError) {
        console.error('Error fetching website source pages:', websiteError);
      }

      console.log('📊 Raw sources data:', sources);
      console.log('📊 Website sources with pages:', websiteSourcesWithPages);

      // Calculate stats
      const statsByType = {
        text: { count: 0, size: 0 },
        file: { count: 0, size: 0 },
        website: { count: 0, size: 0 },
        qa: { count: 0, size: 0 }
      };

      let totalBytes = 0;
      let totalSources = 0;

      // Process regular sources (text, file, qa)
      sources?.forEach(source => {
        if (source.source_type === 'website' && !source.parent_source_id) {
          // Skip website parent sources, we'll handle them separately
          return;
        }
        
        if (source.source_type !== 'website') {
          const contentSize = source.content ? new Blob([source.content]).size : 0;
          statsByType[source.source_type as keyof typeof statsByType].count++;
          statsByType[source.source_type as keyof typeof statsByType].size += contentSize;
          totalBytes += contentSize;
          totalSources++;
        }
      });

      // Process website sources with their crawled pages
      websiteSourcesWithPages?.forEach(websiteSource => {
        statsByType.website.count++;
        totalSources++;
        
        // Calculate total size from all source pages
        const websiteSize = websiteSource.source_pages?.reduce((sum: number, page: any) => {
          return sum + (page.content_size || 0);
        }, 0) || 0;
        
        statsByType.website.size += websiteSize;
        totalBytes += websiteSize;
      });

      console.log('📊 Calculated stats:', { totalSources, totalBytes, statsByType });

      setStats({
        totalSources,
        totalBytes,
        sourcesByType: statsByType
      });
    } catch (err: any) {
      console.error('❌ Error fetching agent source stats:', err);
      setError(err.message || 'Failed to fetch source stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [agentId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`agent-source-stats-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        () => {
          console.log('📡 Agent sources changed, refetching stats');
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages'
        },
        () => {
          console.log('📡 Source pages changed, refetching stats');
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return { stats, loading, error, refetch: fetchStats };
};
