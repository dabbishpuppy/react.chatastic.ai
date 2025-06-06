
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SourcePage {
  id: string;
  url: string;
  status: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  content_size?: number;
  chunks_created?: number;
  processing_time_ms?: number;
  parent_source_id: string;
}

export const useChildSourcesData = (parentSourceId: string) => {
  const [childPages, setChildPages] = useState<SourcePage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchChildPages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('parent_source_id', parentSourceId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching child pages:', error);
      } else {
        setChildPages(data || []);
      }
    } catch (err) {
      console.error('Exception fetching child pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildPages();
    
    // Set up optimized realtime subscription for source_pages
    const subscription = supabase
      .channel(`source-pages-${parentSourceId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'source_pages',
        filter: `parent_source_id=eq.${parentSourceId}` 
      }, (payload) => {
        const newPage = payload.new as SourcePage;
        setChildPages(prev => {
          // Check if page already exists to prevent duplicates
          const exists = prev.some(page => page.id === newPage.id);
          if (exists) return prev;
          return [...prev, newPage];
        });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'source_pages',
        filter: `parent_source_id=eq.${parentSourceId}` 
      }, (payload) => {
        const updatedPage = payload.new as SourcePage;
        setChildPages(prev => 
          prev.map(page => 
            page.id === updatedPage.id ? updatedPage : page
          )
        );
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'source_pages',
        filter: `parent_source_id=eq.${parentSourceId}` 
      }, (payload) => {
        const deletedPage = payload.old as SourcePage;
        setChildPages(prev => 
          prev.filter(page => page.id !== deletedPage.id)
        );
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [parentSourceId]);

  return { childPages, loading };
};
