
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseChildPageStatusProps {
  status: string;
  parentSourceId?: string;
  pageId?: string;
}

export const useChildPageStatus = ({ status, parentSourceId, pageId }: UseChildPageStatusProps) => {
  const [displayStatus, setDisplayStatus] = useState(status);
  const [processingStatus, setProcessingStatus] = useState<string>('pending');
  const [parentRecrawlStatus, setParentRecrawlStatus] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const determineDisplayStatus = (
    childStatus: string, 
    childProcessingStatus: string, 
    parentStatus: string,
    timestamp: number
  ) => {
    // Prevent rapid updates - debounce status changes
    if (timestamp - lastUpdate < 100) {
      return displayStatus;
    }

    console.log('🔍 Determining child display status:', {
      childStatus,
      childProcessingStatus,
      parentStatus,
      pageId,
      timestamp
    });

    // Ensure we have valid statuses
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'trained', 'recrawling'];
    const safeChildStatus = validStatuses.includes(childStatus) ? childStatus : 'pending';
    
    // PRIORITY 1: If parent is actively recrawling, child must show recrawling
    if (parentStatus === 'recrawling') {
      console.log('🔄 Parent is recrawling - setting child to recrawling');
      return 'recrawling';
    }

    // PRIORITY 2: If child is actively being processed (chunking), show "In Progress"
    if (childProcessingStatus === 'processing') {
      console.log('🔄 Child is being processed - setting to in_progress');
      return 'in_progress';
    }

    // PRIORITY 3: If child status is 'in_progress' from source_pages, respect it
    if (safeChildStatus === 'in_progress') {
      console.log('🔄 Child source_pages status is in_progress - keeping in_progress');
      return 'in_progress';
    }

    // PRIORITY 4: If child processing is completed and parent is trained, show "Trained"
    if (safeChildStatus === 'completed' && childProcessingStatus === 'processed') {
      console.log('🎓 Child completed and processed - setting to trained');
      return 'trained';
    }
    
    // PRIORITY 5: Return the safe child status
    console.log('📊 Using child status:', safeChildStatus);
    return safeChildStatus;
  };

  // Monitor changes with proper debouncing
  useEffect(() => {
    if (!parentSourceId || !pageId) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'trained', 'recrawling'];
      const finalStatus = validStatuses.includes(status) ? status : 'pending';
      console.log('📊 No parent/page IDs - setting status to:', finalStatus);
      setDisplayStatus(finalStatus);
      return;
    }

    // Fetch initial state
    const fetchInitialState = async () => {
      console.log('🔍 Fetching initial state for child page:', pageId);
      
      // Get child page status
      const { data: childData } = await supabase
        .from('source_pages')
        .select('processing_status, status')
        .eq('id', pageId)
        .single();
      
      // Get parent recrawl status
      const { data: parentData } = await supabase
        .from('agent_sources')
        .select('crawl_status, metadata')
        .eq('id', parentSourceId)
        .single();
      
      let newProcessingStatus = 'pending';
      let newParentStatus = '';
      
      if (childData) {
        console.log('📊 Child data fetched:', childData);
        newProcessingStatus = childData.processing_status || 'pending';
        setProcessingStatus(newProcessingStatus);
      }
      
      if (parentData) {
        console.log('📊 Parent data fetched:', parentData);
        const metadata = parentData.metadata as Record<string, any> | null;
        const isParentRecrawling = parentData.crawl_status === 'recrawling' || 
                                  (metadata && metadata.is_recrawling === true);
        newParentStatus = isParentRecrawling ? 'recrawling' : parentData.crawl_status || '';
        console.log('📊 Parent recrawl status determined:', newParentStatus);
        setParentRecrawlStatus(newParentStatus);
      }

      const timestamp = Date.now();
      const newDisplayStatus = determineDisplayStatus(
        childData?.status || status, 
        newProcessingStatus,
        newParentStatus,
        timestamp
      );
      
      setDisplayStatus(newDisplayStatus);
      setLastUpdate(timestamp);
    };

    fetchInitialState();

    // Subscribe to child page changes with debouncing
    const childChannel = supabase
      .channel(`child-status-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
          filter: `id=eq.${pageId}`
        },
        (payload) => {
          const updatedChild = payload.new as any;
          console.log('📡 Child page status update:', updatedChild);
          
          const newProcessingStatus = updatedChild.processing_status || 'pending';
          setProcessingStatus(newProcessingStatus);
          
          const timestamp = Date.now();
          const newDisplayStatus = determineDisplayStatus(
            updatedChild.status, 
            newProcessingStatus, 
            parentRecrawlStatus,
            timestamp
          );
          
          setDisplayStatus(newDisplayStatus);
          setLastUpdate(timestamp);
        }
      )
      .subscribe();

    // Subscribe to parent source changes
    const parentChannel = supabase
      .channel(`parent-status-${parentSourceId}`)
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
          console.log('📡 Parent source update:', updatedParent);
          
          const metadata = updatedParent.metadata as Record<string, any> | null;
          const isParentRecrawling = updatedParent.crawl_status === 'recrawling' || 
                                    (metadata && metadata.is_recrawling === true);
          const newParentStatus = isParentRecrawling ? 'recrawling' : updatedParent.crawl_status || '';
          console.log('📡 Parent status update:', newParentStatus);
          setParentRecrawlStatus(newParentStatus);
          
          const timestamp = Date.now();
          const newDisplayStatus = determineDisplayStatus(
            status, 
            processingStatus, 
            newParentStatus,
            timestamp
          );
          
          setDisplayStatus(newDisplayStatus);
          setLastUpdate(timestamp);
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up child status subscriptions for:', pageId);
      supabase.removeChannel(childChannel);
      supabase.removeChannel(parentChannel);
    };
  }, [status, parentSourceId, pageId]);

  const isLoading = displayStatus === 'in_progress' || displayStatus === 'pending' || displayStatus === 'recrawling';

  console.log('🎯 useChildPageStatus final result:', { 
    displayStatus, 
    isLoading, 
    originalStatus: status,
    processingStatus,
    parentRecrawlStatus
  });

  return {
    displayStatus,
    isLoading
  };
};
