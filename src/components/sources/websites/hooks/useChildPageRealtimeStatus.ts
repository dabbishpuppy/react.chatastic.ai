
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
  const [rawStatus, setRawStatus] = useState(initialStatus);
  const [processingStatus, setProcessingStatus] = useState<string>('pending');
  const [parentRecrawlStatus, setParentRecrawlStatus] = useState<string>('');
  const [lastStatusUpdate, setLastStatusUpdate] = useState<number>(Date.now());

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
        setRawStatus(pageData.status);
        setProcessingStatus(pageData.processing_status || 'pending');
      }

      if (parentData) {
        console.log('📊 Initial parent data:', parentData);
        const metadata = parentData.metadata as Record<string, any> | null;
        const isParentRecrawling = parentData.crawl_status === 'recrawling' || 
                                  (metadata && metadata.is_recrawling === true);
        const newParentStatus = isParentRecrawling ? 'recrawling' : parentData.crawl_status || '';
        console.log('📊 Parent recrawl status determined:', newParentStatus);
        setParentRecrawlStatus(newParentStatus);
      }
      
      setLastStatusUpdate(Date.now());
    };

    fetchInitialStatus();

    // Subscribe to child page changes with proper debouncing
    const pageChannel = supabase
      .channel(`child-page-realtime-${pageId}`)
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
          console.log('📡 Child page realtime update:', updatedPage);
          
          // Debounce rapid updates
          const now = Date.now();
          if (now - lastStatusUpdate < 200) {
            console.log('⏱️ Debouncing rapid update');
            return;
          }
          
          setRawStatus(updatedPage.status);
          setProcessingStatus(updatedPage.processing_status || 'pending');
          setLastStatusUpdate(now);
        }
      )
      .subscribe();

    // Subscribe to parent source changes
    const parentChannel = supabase
      .channel(`parent-recrawl-realtime-${parentSourceId}`)
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
          console.log('📡 Parent source realtime update:', updatedSource);
          
          const metadata = updatedSource.metadata as Record<string, any> | null;
          const isParentRecrawling = updatedSource.crawl_status === 'recrawling' || 
                                    (metadata && metadata.is_recrawling === true);
          const newParentStatus = isParentRecrawling ? 'recrawling' : updatedSource.crawl_status || '';
          console.log('📡 Parent status realtime update:', newParentStatus);
          setParentRecrawlStatus(newParentStatus);
          
          // If parent training is completed and child is completed, mark as trained
          if (updatedSource.crawl_status === 'trained' && rawStatus === 'completed') {
            console.log('🎓 Parent training completed - updating child status to trained');
            setRawStatus('trained');
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`🔌 Cleaning up realtime subscriptions for page: ${pageId}`);
      supabase.removeChannel(pageChannel);
      supabase.removeChannel(parentChannel);
    };
  }, [pageId, parentSourceId]);

  // Determine display status with consistent logic
  const getDisplayStatus = () => {
    console.log('🔍 Determining realtime display status:', {
      parentRecrawlStatus,
      rawStatus,
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
    if (rawStatus === 'completed' && processingStatus === 'processed') {
      console.log('🎓 Child processing completed - showing trained status');
      return 'trained';
    }
    
    // PRIORITY 4: Return the current child status, ensuring it's valid
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'trained', 'recrawling'];
    const finalStatus = validStatuses.includes(rawStatus) ? rawStatus : 'pending';
    console.log('📊 Final realtime status determined:', finalStatus, 'from original:', rawStatus);
    return finalStatus;
  };

  const displayStatus = getDisplayStatus();
  const isLoading = displayStatus === 'in_progress' || displayStatus === 'pending' || displayStatus === 'recrawling';

  console.log('🎯 Final realtime hook result:', { 
    displayStatus, 
    isLoading, 
    rawStatus, 
    processingStatus, 
    parentRecrawlStatus 
  });

  return {
    displayStatus,
    isLoading,
    rawStatus,
    processingStatus
  };
};
