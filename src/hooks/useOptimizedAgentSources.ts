
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRAGServices } from './useRAGServices';
import { AgentSource } from '@/types/rag';
import { supabase } from '@/integrations/supabase/client';

export const useOptimizedAgentSources = () => {
  const { agentId } = useParams();
  const [sources, setSources] = useState<AgentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sources: sourceService } = useRAGServices();
  const channelRef = useRef<any>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoadRef = useRef(true);

  const fetchSources = useCallback(async () => {
    if (!agentId) return;

    try {
      setError(null);
      console.log(`🚀 Fetching all sources for agent: ${agentId}`);
      
      const fetchedSources = await sourceService.getSourcesByAgent(agentId);
      
      console.log(`✅ Fetched ${fetchedSources.length} total sources`);
      setSources(fetchedSources);
    } catch (err: any) {
      console.error('❌ Error fetching sources:', err);
      setError(err.message || 'Failed to fetch sources');
    } finally {
      setLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [agentId, sourceService]);

  // Debounced fetch to prevent rapid successive calls
  const debouncedFetch = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(fetchSources, 100);
  }, [fetchSources]);

  // Initial fetch
  useEffect(() => {
    if (isFirstLoadRef.current) {
      fetchSources();
    }
  }, [fetchSources]);

  // Set up optimized real-time subscription
  useEffect(() => {
    if (!agentId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`unified-sources-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📡 Real-time update:', payload.eventType);
          
          // Only refetch if it's not the initial load
          if (!isFirstLoadRef.current) {
            debouncedFetch();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [agentId, debouncedFetch]);

  const removeSourceFromState = useCallback((sourceId: string) => {
    setSources(prev => prev.filter(source => source.id !== sourceId));
  }, []);

  const refetch = useCallback(() => {
    console.log('🔄 Manual refetch triggered');
    fetchSources();
  }, [fetchSources]);

  // Helper functions to filter sources by type
  const getSourcesByType = useCallback((sourceType: string) => {
    return sources.filter(source => source.source_type === sourceType);
  }, [sources]);

  return {
    sources,
    loading,
    error,
    removeSourceFromState,
    refetch,
    getSourcesByType
  };
};
