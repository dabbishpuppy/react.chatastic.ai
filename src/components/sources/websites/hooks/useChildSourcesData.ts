
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SourcePage {
  id: string;
  url: string;
  status: string;
  processing_status?: string;
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
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchChildPages = async () => {
      if (!parentSourceId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('source_pages')
          .select(`
            id,
            url,
            status,
            processing_status,
            created_at,
            completed_at,
            error_message,
            content_size,
            chunks_created,
            processing_time_ms,
            parent_source_id
          `)
          .eq('parent_source_id', parentSourceId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching child pages:', error);
          return;
        }

        setChildPages(data || []);
      } catch (error) {
        console.error('Error in fetchChildPages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildPages();
  }, [parentSourceId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!parentSourceId) return;

    console.log(`📡 Setting up real-time subscription for child pages of parent: ${parentSourceId}`);

    const channel = supabase
      .channel(`child-pages-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Child page update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newPage = payload.new as SourcePage;
            setChildPages(prev => {
              const exists = prev.some(page => page.id === newPage.id);
              if (exists) return prev;
              return [...prev, newPage];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPage = payload.new as SourcePage;
            setChildPages(prev => 
              prev.map(page => 
                page.id === updatedPage.id ? updatedPage : page
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedPage = payload.old as SourcePage;
            setChildPages(prev => 
              prev.filter(page => page.id !== deletedPage.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Child pages subscription status for ${parentSourceId}:`, status);
      });

    return () => {
      console.log(`🔌 Cleaning up child pages subscription for parent: ${parentSourceId}`);
      supabase.removeChannel(channel);
    };
  }, [parentSourceId]);

  return { childPages, loading };
};
