
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
          event: 'INSERT',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Child page INSERT:', payload);
          const newPage = payload.new as SourcePage;
          setChildSources(prev => {
            // Check if page already exists to avoid duplicates
            const exists = prev.some(page => page.id === newPage.id);
            if (exists) return prev;
            console.log(`✅ Adding new child page: ${newPage.url}`);
            return [...prev, newPage];
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
          setChildSources(prev => 
            prev.map(page => 
              page.id === updatedPage.id ? updatedPage : page
            )
          );
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
          setChildSources(prev => 
            prev.filter(page => page.id !== deletedPage.id)
          );
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

  return childSources;
};
