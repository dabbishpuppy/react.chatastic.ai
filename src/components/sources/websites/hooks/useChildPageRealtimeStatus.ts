
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseChildPageRealtimeStatusProps {
  pageId: string;
  parentSourceId: string;
  initialStatus: string;
}

export const useChildPageRealtimeStatus = ({ 
  pageId, 
  parentSourceId, 
  initialStatus 
}: UseChildPageRealtimeStatusProps) => {
  const [status, setStatus] = useState(initialStatus);
  const [processingStatus, setProcessingStatus] = useState<string>('pending');

  useEffect(() => {
    if (!pageId || !parentSourceId) return;

    console.log(`📡 Setting up realtime status tracking for child page: ${pageId}`);

    // Fetch initial processing status
    const fetchInitialStatus = async () => {
      const { data: pageData } = await supabase
        .from('source_pages')
        .select('processing_status, status')
        .eq('id', pageId)
        .single();
      
      if (pageData) {
        setStatus(pageData.status);
        setProcessingStatus(pageData.processing_status || 'pending');
      }
    };

    fetchInitialStatus();

    // Subscribe to child page changes
    const pageChannel = supabase
      .channel(`child-page-status-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
          filter: `id=eq.${pageId}`
        },
        (payload) => {
          const updatedPage = payload.new as any;
          console.log('📡 Child page status update:', updatedPage);
          
          setStatus(updatedPage.status);
          setProcessingStatus(updatedPage.processing_status || 'pending');
        }
      )
      .subscribe();

    // Subscribe to parent source training completion
    const parentChannel = supabase
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
          const updatedSource = payload.new as any;
          console.log('📡 Parent source update:', updatedSource);
          
          // If parent training is completed and child is completed, mark as trained
          if (updatedSource.crawl_status === 'trained' && status === 'completed') {
            console.log('🎓 Parent training completed - updating child status to trained');
            setStatus('trained');
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`🔌 Cleaning up realtime subscriptions for page: ${pageId}`);
      supabase.removeChannel(pageChannel);
      supabase.removeChannel(parentChannel);
    };
  }, [pageId, parentSourceId, status]);

  // Determine display status based on processing state
  const getDisplayStatus = () => {
    // If child is actively being processed (chunking), show "In Progress"
    if (processingStatus === 'processing') {
      return 'in_progress';
    }

    // If child processing is completed (chunked) and parent is trained, show "Trained"
    if (status === 'completed' && processingStatus === 'processed') {
      return 'trained';
    }
    
    return status;
  };

  const displayStatus = getDisplayStatus();
  const isLoading = displayStatus === 'in_progress' || displayStatus === 'pending';

  return {
    displayStatus,
    isLoading,
    rawStatus: status,
    processingStatus
  };
};
