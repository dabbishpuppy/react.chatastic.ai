
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource } from '@/types/rag';

interface SourcePage {
  id: string;
  url: string;
  status: string;
  created_at: string;
  parent_source_id: string;
  content_size?: number;
  compression_ratio?: number;
  error_message?: string;
}

export const useOptimizedChildSources = (parentSourceId: string) => {
  const [childSources, setChildSources] = useState<AgentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);

  const convertToAgentSource = useCallback((page: SourcePage): AgentSource => ({
    id: page.id,
    url: page.url,
    title: new URL(page.url).pathname || page.url,
    crawl_status: page.status,
    created_at: page.created_at,
    updated_at: page.created_at,
    parent_source_id: page.parent_source_id,
    agent_id: '',
    source_type: 'website',
    is_active: true,
    is_excluded: false,
    original_size: page.content_size || 0,
    compressed_size: page.content_size ? Math.round(page.content_size * (page.compression_ratio || 1)) : 0,
    metadata: { error_message: page.error_message } as Record<string, any>,
    requires_manual_training: false
  }), []);

  const fetchChildSources = useCallback(async () => {
    if (!parentSourceId) return;

    try {
      setError(null);
      
      const { data: sourcePages, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('parent_source_id', parentSourceId)
        .order('created_at', { ascending: true });
      
      if (error) {
        setError(`Failed to fetch child pages: ${error.message}`);
        return;
      }

      const formattedSources = (sourcePages || []).map(convertToAgentSource);
      setChildSources(formattedSources);
    } catch (err: any) {
      setError(`Error loading child pages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [parentSourceId, convertToAgentSource]);

  // Debounced update to prevent rapid re-renders
  const debouncedUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return;
    
    lastUpdateRef.current = now;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(fetchChildSources, 50);
  }, [fetchChildSources]);

  // Handle real-time updates directly
  const handleRealtimeUpdate = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newPage = payload.new as SourcePage;
      if (newPage.parent_source_id === parentSourceId) {
        setChildSources(prev => [...prev, convertToAgentSource(newPage)]);
      }
    } else if (payload.eventType === 'UPDATE') {
      const updatedPage = payload.new as SourcePage;
      if (updatedPage.parent_source_id === parentSourceId) {
        setChildSources(prev => 
          prev.map(source => 
            source.id === updatedPage.id 
              ? convertToAgentSource(updatedPage)
              : source
          )
        );
      }
    } else if (payload.eventType === 'DELETE') {
      const deletedPage = payload.old as SourcePage;
      setChildSources(prev => prev.filter(source => source.id !== deletedPage.id));
    }
  }, [parentSourceId, convertToAgentSource]);

  // Initial fetch
  useEffect(() => {
    fetchChildSources();
  }, [fetchChildSources]);

  // Set up optimized real-time subscription
  useEffect(() => {
    if (!parentSourceId) return;

    const subscription = supabase
      .channel(`optimized-source-pages-${parentSourceId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'source_pages',
        filter: `parent_source_id=eq.${parentSourceId}` 
      }, handleRealtimeUpdate)
      .subscribe();
      
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      subscription.unsubscribe();
    };
  }, [parentSourceId, handleRealtimeUpdate]);

  return {
    childSources,
    loading,
    error,
    refetch: fetchChildSources
  };
};
