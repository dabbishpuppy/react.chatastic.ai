
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

export const useChildSourcesRealtime = (parentSourceId: string, initialChildSources: SourcePage[] = []) => {
  const [childSources, setChildSources] = useState<SourcePage[]>(initialChildSources);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data when parentSourceId changes
  useEffect(() => {
    if (!parentSourceId) {
      console.log('📡 useChildSourcesRealtime: No parentSourceId provided');
      setChildSources([]);
      setIsLoading(false);
      return;
    }

    const fetchInitialChildSources = async () => {
      console.log(`📡 Fetching initial child pages for parent: ${parentSourceId}`);
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('source_pages')
          .select('*')
          .eq('parent_source_id', parentSourceId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('❌ Error fetching child pages:', error);
          setChildSources([]);
        } else {
          console.log(`✅ Fetched ${data?.length || 0} child pages for parent ${parentSourceId}:`, data);
          setChildSources(data || []);
        }
      } catch (error) {
        console.error('❌ Exception fetching child pages:', error);
        setChildSources([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialChildSources();
  }, [parentSourceId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!parentSourceId) {
      return;
    }

    console.log(`📡 Setting up real-time subscription for child pages of parent: ${parentSourceId}`);

    const channel = supabase
      .channel(`child-pages-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Child page INSERT:', payload);
          const newPage = payload.new as SourcePage;
          setChildSources(prev => {
            const exists = prev.some(page => page.id === newPage.id);
            if (exists) {
              console.log(`📡 Page ${newPage.id} already exists, skipping duplicate`);
              return prev;
            }
            console.log(`✅ Adding new child page: ${newPage.url} (${newPage.id})`);
            return [...prev, newPage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Child page UPDATE:', payload);
          const updatedPage = payload.new as SourcePage;
          setChildSources(prev => {
            return prev.map(page => 
              page.id === updatedPage.id ? updatedPage : page
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Child page DELETE:', payload);
          const deletedPage = payload.old as SourcePage;
          setChildSources(prev => {
            return prev.filter(page => page.id !== deletedPage.id);
          });
        }
      )
      .subscribe((status) => {
        console.log(`📡 Child pages subscription status for ${parentSourceId}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Successfully subscribed to child pages for parent: ${parentSourceId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Channel error for parent: ${parentSourceId}`);
        }
      });

    return () => {
      console.log(`🔌 Cleaning up child pages subscription for parent: ${parentSourceId}`);
      supabase.removeChannel(channel);
    };
  }, [parentSourceId]);

  console.log('📡 useChildSourcesRealtime returning:', {
    parentSourceId,
    count: childSources.length,
    isLoading,
    pages: childSources.map(p => ({ id: p.id, url: p.url, status: p.status }))
  });

  return { childSources, isLoading };
};
