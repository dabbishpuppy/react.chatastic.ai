
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
    console.log('Updating child display status:', {
      childStatus,
      processingStatus,
      parentStatus,
      pageId
    });

    // If parent is recrawling, show recrawling status for child
    if (parentStatus === 'recrawling') {
      setDisplayStatus('recrawling');
      return;
    }

    // If child is actively being processed (chunking), show "In Progress"
    if (processingStatus === 'processing') {
      setDisplayStatus('in_progress');
      return;
    }

    // If child processing is completed (chunked), show "Trained" immediately
    if (childStatus === 'completed' && processingStatus === 'processed') {
      console.log('Setting child status to TRAINED - processing completed for this page');
      setDisplayStatus('trained');
      return;
    }
    
    // Default to original status
    setDisplayStatus(childStatus);
  };

  // Monitor child processing status and parent recrawl status
  useEffect(() => {
    if (!parentSourceId || !pageId) {
      setDisplayStatus(status);
      return;
    }

    // Fetch initial state
    const fetchInitialState = async () => {
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
        setChildProcessingStatus(childData.processing_status || 'pending');
      }
      
      if (parentData) {
        const isParentRecrawling = parentData.crawl_status === 'recrawling' || 
                                  parentData.metadata?.is_recrawling === true;
        setParentRecrawlStatus(isParentRecrawling ? 'recrawling' : parentData.crawl_status);
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
          console.log('Child page processing update:', updatedChild);
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
          console.log('Parent source update for child:', updatedParent);
          
          const isParentRecrawling = updatedParent.crawl_status === 'recrawling' || 
                                    updatedParent.metadata?.is_recrawling === true;
          const newParentStatus = isParentRecrawling ? 'recrawling' : updatedParent.crawl_status;
          setParentRecrawlStatus(newParentStatus);
          
          updateDisplayStatus(status, childProcessingStatus, newParentStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(childChannel);
      supabase.removeChannel(parentChannel);
    };
  }, [status, parentSourceId, pageId, childProcessingStatus, parentRecrawlStatus]);

  return {
    displayStatus,
    isLoading: displayStatus === 'in_progress' || displayStatus === 'pending' || displayStatus === 'recrawling'
  };
};
