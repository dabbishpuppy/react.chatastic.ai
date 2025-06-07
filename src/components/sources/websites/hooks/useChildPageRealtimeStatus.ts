
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
        console.log('📊 Initial page data:', pageData);
        setStatus(pageData.status);
        setProcessingStatus(pageData.processing_status || 'pending');
      }

      if (parentData) {
        console.log('📊 Initial parent data:', parentData);
        const metadata = parentData.metadata as Record<string, any> | null;
        const isParentRecrawling = parentData.crawl_status === 'recrawling' || 
                                  (metadata && metadata.is_recrawling === true);
        const newParentStatus = isParentRecrawling ? 'recrawling' : parentData.crawl_status || '';
        console.log('📊 Parent recrawl status determined:', newParentStatus, { crawl_status: parentData.crawl_status, is_recrawling: metadata?.is_recrawling });
        setParentRecrawlStatus(newParentStatus);
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
          
          const metadata = updatedSource.metadata as Record<string, any> | null;
          const isParentRecrawling = updatedSource.crawl_status === 'recrawling' || 
                                    (metadata && metadata.is_recrawling === true);
          const newParentStatus = isParentRecrawling ? 'recrawling' : updatedSource.crawl_status || '';
          console.log('📡 Parent status update - new recrawl status:', newParentStatus, { crawl_status: updatedSource.crawl_status, is_recrawling: metadata?.is_recrawling });
          setParentRecrawlStatus(newParentStatus);
          
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
    console.log('🔍 Determining display status:', {
      parentRecrawlStatus,
      status,
      processingStatus,
      pageId
    });

    // PRIORITY 1: If parent is recrawling, show recrawling status for child
    if (parentRecrawlStatus === 'recrawling') {
      console.log('🔄 Parent is recrawling - showing recrawling status');
      return 'recrawling';
    }

    // PRIORITY 2: If child is actively being processed (chunking), show "In Progress"
    if (processingStatus === 'processing') {
      console.log('🔄 Child is being processed - showing in_progress status');
      return 'in_progress';
    }

    // PRIORITY 3: If child processing is completed (chunked) and parent is trained, show "Trained"
    if (status === 'completed' && processingStatus === 'processed') {
      console.log('🎓 Child processing completed - showing trained status');
      return 'trained';
    }
    
    // PRIORITY 4: Return the current child status, ensuring it's a valid status
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'trained', 'recrawling'];
    const finalStatus = validStatuses.includes(status) ? status : 'pending';
    console.log('📊 Final status determined:', finalStatus, 'from original:', status);
    return finalStatus;
  };

  const displayStatus = getDisplayStatus();
  const isLoading = displayStatus === 'in_progress' || displayStatus === 'pending' || displayStatus === 'recrawling';

  console.log('🎯 Final hook result:', { displayStatus, isLoading, rawStatus: status, processingStatus, parentRecrawlStatus });

  return {
    displayStatus,
    isLoading,
    rawStatus: status,
    processingStatus
  };
};
