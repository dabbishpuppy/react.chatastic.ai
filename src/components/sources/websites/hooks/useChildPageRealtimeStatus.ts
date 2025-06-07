
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
  const [parentRecrawlStatus, setParentRecrawlStatus] = useState<string>('');

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
      
      const { data: parentData } = await supabase
        .from('agent_sources')
        .select('crawl_status, metadata')
        .eq('id', parentSourceId)
        .single();
      
      if (pageData) {
        setStatus(pageData.status);
        setProcessingStatus(pageData.processing_status || 'pending');
      }

      if (parentData) {
        const isParentRecrawling = parentData.crawl_status === 'recrawling' || 
                                  parentData.metadata?.is_recrawling === true;
        setParentRecrawlStatus(isParentRecrawling ? 'recrawling' : parentData.crawl_status);
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

    // Subscribe to parent source changes for recrawl status
    const parentChannel = supabase
      .channel(`parent-recrawl-status-${parentSourceId}`)
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
          console.log('📡 Parent source update for recrawl:', updatedSource);
          
          const isParentRecrawling = updatedSource.crawl_status === 'recrawling' || 
                                    updatedSource.metadata?.is_recrawling === true;
          setParentRecrawlStatus(isParentRecrawling ? 'recrawling' : updatedSource.crawl_status);
          
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

  // Determine display status based on processing state and parent recrawl status
  const getDisplayStatus = () => {
    // If parent is recrawling, show recrawling status for child
    if (parentRecrawlStatus === 'recrawling') {
      return 'recrawling';
    }

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
  const isLoading = displayStatus === 'in_progress' || displayStatus === 'pending' || displayStatus === 'recrawling';

  return {
    displayStatus,
    isLoading,
    rawStatus: status,
    processingStatus
  };
};
