
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseChildPageStatusProps {
  status: string;
  parentSourceId?: string;
  pageId?: string;
}

export const useChildPageStatus = ({ status, parentSourceId, pageId }: UseChildPageStatusProps) => {
  const [displayStatus, setDisplayStatus] = useState(status);
  const [childProcessingStatus, setChildProcessingStatus] = useState<string>('pending');
  const [parentRecrawlStatus, setParentRecrawlStatus] = useState<string>('');

  const updateDisplayStatus = (childStatus: string, processingStatus: string, parentStatus?: string) => {
    console.log('🔄 Updating child display status:', {
      childStatus,
      processingStatus,
      parentStatus,
      pageId
    });

    // Ensure we have valid statuses
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'trained', 'recrawling'];
    const safeChildStatus = validStatuses.includes(childStatus) ? childStatus : 'pending';
    const safeParentStatus = parentStatus || '';

    // PRIORITY 1: If parent is recrawling, show recrawling status for child
    if (safeParentStatus === 'recrawling') {
      console.log('🔄 Parent is recrawling - setting child to recrawling');
      setDisplayStatus('recrawling');
      return;
    }

    // PRIORITY 2: If child is actively being processed (chunking), show "In Progress"
    if (processingStatus === 'processing') {
      console.log('🔄 Child is being processed - setting to in_progress');
      setDisplayStatus('in_progress');
      return;
    }

    // PRIORITY 3: If child processing is completed (chunked), show "Trained" immediately
    if (safeChildStatus === 'completed' && processingStatus === 'processed') {
      console.log('🎓 Setting child status to TRAINED - processing completed for this page');
      setDisplayStatus('trained');
      return;
    }
    
    // PRIORITY 4: Default to the safe child status
    console.log('📊 Setting child status to:', safeChildStatus);
    setDisplayStatus(safeChildStatus);
  };

  // Monitor child processing status and parent recrawl status
  useEffect(() => {
    if (!parentSourceId || !pageId) {
      // Ensure we set a valid status even without parent/page IDs
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
      
      if (childData) {
        console.log('📊 Child data fetched:', childData);
        setChildProcessingStatus(childData.processing_status || 'pending');
      }
      
      if (parentData) {
        console.log('📊 Parent data fetched:', parentData);
        const metadata = parentData.metadata as Record<string, any> | null;
        const isParentRecrawling = parentData.crawl_status === 'recrawling' || 
                                  (metadata && metadata.is_recrawling === true);
        const newParentStatus = isParentRecrawling ? 'recrawling' : parentData.crawl_status || '';
        console.log('📊 Parent recrawl status determined:', newParentStatus, { crawl_status: parentData.crawl_status, is_recrawling: metadata?.is_recrawling });
        setParentRecrawlStatus(newParentStatus);
      }

      updateDisplayStatus(
        childData?.status || status, 
        childData?.processing_status || 'pending',
        parentData?.crawl_status
      );
    };

    fetchInitialState();

    // Subscribe to child page processing status changes
    const childChannel = supabase
      .channel(`child-processing-${pageId}`)
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
          console.log('📡 Child page processing update:', updatedChild);
          const newProcessingStatus = updatedChild.processing_status || 'pending';
          setChildProcessingStatus(newProcessingStatus);
          
          updateDisplayStatus(updatedChild.status, newProcessingStatus, parentRecrawlStatus);
        }
      )
      .subscribe();

    // Subscribe to parent source changes for recrawl status
    const parentChannel = supabase
      .channel(`parent-recrawl-${parentSourceId}`)
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
          console.log('📡 Parent source update for child:', updatedParent);
          
          const metadata = updatedParent.metadata as Record<string, any> | null;
          const isParentRecrawling = updatedParent.crawl_status === 'recrawling' || 
                                    (metadata && metadata.is_recrawling === true);
          const newParentStatus = isParentRecrawling ? 'recrawling' : updatedParent.crawl_status || '';
          console.log('📡 Parent status update - new recrawl status:', newParentStatus, { crawl_status: updatedParent.crawl_status, is_recrawling: metadata?.is_recrawling });
          setParentRecrawlStatus(newParentStatus);
          
          updateDisplayStatus(status, childProcessingStatus, newParentStatus);
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up child status subscriptions for:', pageId);
      supabase.removeChannel(childChannel);
      supabase.removeChannel(parentChannel);
    };
  }, [status, parentSourceId, pageId, childProcessingStatus, parentRecrawlStatus]);

  const isLoading = displayStatus === 'in_progress' || displayStatus === 'pending' || displayStatus === 'recrawling';

  console.log('🎯 useChildPageStatus final result:', { displayStatus, isLoading, originalStatus: status });

  return {
    displayStatus,
    isLoading
  };
};
