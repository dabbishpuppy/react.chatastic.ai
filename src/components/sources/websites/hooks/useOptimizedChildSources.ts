
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SourcePage {
  id: string;
  url: string;
  status: string;
  created_at: string;
  parent_source_id: string;
  content_size?: number;
  compression_ratio?: number;
  error_message?: string;
  chunks_created?: number;
  processing_time_ms?: number;
  completed_at?: string;
}

export const useOptimizedChildSources = (parentSourceId: string) => {
  const [childPages, setChildPages] = useState<SourcePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);

  const fetchChildPages = useCallback(async () => {
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

      setChildPages(sourcePages || []);
    } catch (err: any) {
      setError(`Error loading child pages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [parentSourceId]);

  // Debounced update to prevent rapid re-renders
  const debouncedUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return;
    
    lastUpdateRef.current = now;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(fetchChildPages, 50);
  }, [fetchChildPages]);

  // Handle real-time updates directly
  const handleRealtimeUpdate = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newPage = payload.new as SourcePage;
      if (newPage.parent_source_id === parentSourceId) {
        setChildPages(prev => [...prev, newPage]);
      }
    } else if (payload.eventType === 'UPDATE') {
      const updatedPage = payload.new as SourcePage;
      if (updatedPage.parent_source_id === parentSourceId) {
        setChildPages(prev => 
          prev.map(page => 
            page.id === updatedPage.id 
              ? updatedPage
              : page
          )
        );
      }
    } else if (payload.eventType === 'DELETE') {
      const deletedPage = payload.old as SourcePage;
      setChildPages(prev => prev.filter(page => page.id !== deletedPage.id));
    }
  }, [parentSourceId]);

  // Initial fetch
  useEffect(() => {
    fetchChildPages();
  }, [fetchChildPages]);

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
    childPages,
    loading,
    error,
    refetch: fetchChildPages
  };
};
