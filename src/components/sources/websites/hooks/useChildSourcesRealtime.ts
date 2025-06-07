
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
  processing_status?: string;
}

export const useChildSourcesRealtime = (parentSourceId: string, initialChildSources: SourcePage[] = []) => {
  const [childSources, setChildSources] = useState<SourcePage[]>(initialChildSources);

  useEffect(() => {
    setChildSources(initialChildSources);
  }, [initialChildSources]);

  useEffect(() => {
    if (!parentSourceId) return;

    console.log(`📡 Setting up enhanced real-time subscription for child pages of parent: ${parentSourceId}`);

    // Subscribe to source_pages changes for children of this parent
    const childPagesChannel = supabase
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
            setChildSources(prev => {
              // Check if page already exists to avoid duplicates
              const exists = prev.some(page => page.id === newPage.id);
              if (exists) return prev;
              return [...prev, newPage];
            });
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
      .subscribe((status) => {
        console.log(`📡 Child pages subscription status for ${parentSourceId}:`, status);
      });

    // Subscribe to parent source training completion to trigger child status updates
    const parentTrainingChannel = supabase
      .channel(`parent-training-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `id=eq.${parentSourceId}`
        },
        (payload) => {
          const updatedParent = payload.new as any;
          const metadata = updatedParent.metadata as any || {};
          
          console.log('📡 Parent training status update:', {
            crawl_status: updatedParent.crawl_status,
            training_status: metadata.training_status,
            training_completed_at: metadata.training_completed_at
          });
          
          // If parent training completed, trigger a status refresh for all children
          if (metadata.training_completed_at || metadata.last_trained_at || updatedParent.crawl_status === 'trained') {
            console.log('🎓 Parent training completed - triggering child status updates');
            
            // Dispatch global training completion event
            window.dispatchEvent(new CustomEvent('trainingCompleted', {
              detail: { 
                parentSourceId: parentSourceId,
                timestamp: Date.now() 
              }
            }));
            
            // Update all completed children to show trained status
            setChildSources(prev => 
              prev.map(page => ({
                ...page,
                // Add a flag to indicate training is completed for UI purposes
                __parentTrainingCompleted: true
              }))
            );
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Parent training subscription status for ${parentSourceId}:`, status);
      });

    return () => {
      console.log(`🔌 Cleaning up enhanced subscriptions for parent: ${parentSourceId}`);
      supabase.removeChannel(childPagesChannel);
      supabase.removeChannel(parentTrainingChannel);
    };
  }, [parentSourceId]);

  return childSources;
};
