
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseChildSourceSizeRealtimeProps {
  parentSourceId: string;
  initialChildSources: any[];
}

export const useChildSourceSizeRealtime = ({ 
  parentSourceId, 
  initialChildSources 
}: UseChildSourceSizeRealtimeProps) => {
  const [childSources, setChildSources] = useState(initialChildSources);

  // Calculate total sizes from child sources
  const totalContentSize = childSources.reduce((total, child) => {
    return total + (child.content_size || 0);
  }, 0);

  const compressedContentSize = childSources.reduce((total, child) => {
    const originalSize = child.content_size || 0;
    const compressionRatio = child.compression_ratio || 0.3;
    return total + Math.round(originalSize * compressionRatio);
  }, 0);

  useEffect(() => {
    setChildSources(initialChildSources);
  }, [initialChildSources]);

  useEffect(() => {
    if (!parentSourceId) return;

    console.log(`📡 Setting up realtime size tracking for parent: ${parentSourceId}`);

    // Subscribe to child page changes that affect size calculations
    const channel = supabase
      .channel(`child-sizes-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Child page size update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newPage = payload.new as any;
            setChildSources(prev => {
              const exists = prev.some(page => page.id === newPage.id);
              if (exists) return prev;
              return [...prev, newPage];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPage = payload.new as any;
            setChildSources(prev => 
              prev.map(page => 
                page.id === updatedPage.id ? updatedPage : page
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedPage = payload.old as any;
            setChildSources(prev => 
              prev.filter(page => page.id !== deletedPage.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Child sizes subscription status for ${parentSourceId}:`, status);
      });

    return () => {
      console.log(`🔌 Cleaning up child sizes subscription for parent: ${parentSourceId}`);
      supabase.removeChannel(channel);
    };
  }, [parentSourceId]);

  return {
    childSources,
    totalContentSize,
    compressedContentSize
  };
};
