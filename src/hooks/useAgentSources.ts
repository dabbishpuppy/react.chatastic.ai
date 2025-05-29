import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRAGServices } from './useRAGServices';
import { AgentSource } from '@/types/rag';
import { supabase } from '@/integrations/supabase/client';

export const useAgentSources = (sourceType?: string) => {
  const { agentId } = useParams();
  const [sources, setSources] = useState<AgentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sources: sourceService } = useRAGServices();
  const channelRef = useRef<any>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize source filtering
  const filteredSources = useMemo(() => {
    console.log(`🔍 Filtering sources: ${sources.length} total, sourceType: ${sourceType}`);
    const filtered = sourceType 
      ? sources.filter(source => source.source_type === sourceType)
      : sources;
    console.log(`✅ Filtered to ${filtered.length} sources`);
    return filtered;
  }, [sources, sourceType]);

  const fetchSources = useCallback(async (retryCount = 0) => {
    if (!agentId) {
      console.log('❌ No agentId provided, skipping fetch');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log(`🚀 Fetching sources (attempt ${retryCount + 1})... sourceType: ${sourceType || 'all'}`);
      
      const fetchedSources = sourceType 
        ? await sourceService.getSourcesByType(agentId, sourceType as any)
        : await sourceService.getSourcesByAgent(agentId);
      
      console.log(`✅ Successfully loaded ${fetchedSources.length} sources:`, {
        total: fetchedSources.length,
        byType: fetchedSources.reduce((acc, source) => {
          acc[source.source_type] = (acc[source.source_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      
      setSources(fetchedSources);
    } catch (err: any) {
      console.error('❌ Error fetching sources:', err);
      
      // Implement retry logic for timeout errors
      if ((err.message?.includes('timeout') || err.message?.includes('500')) && retryCount < 3) {
        const delay = Math.min((retryCount + 1) * 2000, 10000); // Max 10 seconds
        console.log(`🔄 Retrying fetch in ${delay / 1000} seconds...`);
        retryTimeoutRef.current = setTimeout(() => {
          fetchSources(retryCount + 1);
        }, delay);
        return;
      }
      
      setError(err.message || 'Failed to fetch sources');
      // Don't clear sources on error - keep previous data if available
      if (sources.length === 0) {
        setSources([]);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId, sourceType, sourceService, sources.length]);

  // Debounced state update function
  const debouncedUpdate = useCallback((updateFn: () => void) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(updateFn, 100);
  }, []);

  useEffect(() => {
    console.log(`🔄 useEffect triggered: agentId=${agentId}, sourceType=${sourceType}`);
    fetchSources();
    
    // Cleanup retry timeout on unmount or dependency change
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchSources]);

  // Set up real-time subscription for agent sources
  useEffect(() => {
    if (!agentId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`agent-sources-consolidated-${agentId}-${sourceType || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📡 Real-time agent sources update:', payload);
          
          debouncedUpdate(() => {
            try {
              if (payload.eventType === 'INSERT') {
                const newSource = payload.new as AgentSource;
                if (!sourceType || newSource.source_type === sourceType) {
                  setSources(prev => {
                    // Check if source already exists to avoid duplicates
                    if (prev.some(source => source.id === newSource.id)) {
                      return prev;
                    }
                    console.log(`➕ Adding new source: ${newSource.title}`);
                    return [...prev, newSource];
                  });
                }
              } else if (payload.eventType === 'UPDATE') {
                const updatedSource = payload.new as AgentSource;
                if (!sourceType || updatedSource.source_type === sourceType) {
                  setSources(prev => {
                    const updated = prev.map(source => 
                      source.id === updatedSource.id ? updatedSource : source
                    );
                    console.log(`🔄 Updated source: ${updatedSource.title}`);
                    return updated;
                  });
                }
              } else if (payload.eventType === 'DELETE') {
                const deletedSource = payload.old as AgentSource;
                setSources(prev => {
                  const filtered = prev.filter(source => source.id !== deletedSource.id);
                  console.log(`🗑️ Deleted source: ${deletedSource.title}`);
                  return filtered;
                });
              }
            } catch (error) {
              console.error('❌ Error handling real-time update:', error);
            }
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [agentId, sourceType, debouncedUpdate]);

  const removeSourceFromState = useCallback((sourceId: string) => {
    setSources(prev => prev.filter(source => source.id !== sourceId));
  }, []);

  const refetch = useCallback(() => {
    console.log('🔄 Manual refetch triggered');
    fetchSources();
  }, [fetchSources]);

  console.log(`🎯 useAgentSources returning: ${filteredSources.length} sources, loading: ${loading}, error: ${error}`);

  return {
    sources: filteredSources,
    loading,
    error,
    removeSourceFromState,
    refetch
  };
};
