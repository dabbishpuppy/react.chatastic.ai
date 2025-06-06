
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

  useEffect(() => {
    setChildSources(initialChildSources);
  }, [initialChildSources]);

  useEffect(() => {
    if (!parentSourceId) return;

    console.log(`📡 Setting up real-time subscription for child pages of parent: ${parentSourceId}`);

    // Subscribe to source_pages changes for children of this parent
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
            setChildSources(prev => [...prev, newPage]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedPage = payload.new as SourcePage;
            setChildSources(prev => 
              prev.map(page => 
                page.id === updatedPage.id ? updatedPage : page
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedPage = payload.old as SourcePage;
            setChildSources(prev => 
              prev.filter(page => page.id !== deletedPage.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`🔌 Cleaning up child pages subscription for parent: ${parentSourceId}`);
      supabase.removeChannel(channel);
    };
  }, [parentSourceId]);

  return childSources;
};
