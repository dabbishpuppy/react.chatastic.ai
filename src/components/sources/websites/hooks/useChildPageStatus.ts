
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

  const updateDisplayStatus = (childStatus: string, processingStatus: string, parentTrainingStatus?: string) => {
    console.log('Updating child display status:', {
      childStatus,
      processingStatus,
      parentTrainingStatus,
      pageId
    });

    // If parent is training and child is completed, show "in_progress" to indicate training is happening
    if (parentTrainingStatus === 'in_progress' && childStatus === 'completed') {
      setDisplayStatus('in_progress');
      return;
    }

    // If child is actively being processed (chunking), show "in_progress"
    if (processingStatus === 'processing') {
      setDisplayStatus('in_progress');
      return;
    }

    // If child processing is completed (chunked) and parent training is done, show "trained"
    if (childStatus === 'completed' && processingStatus === 'processed' && parentTrainingStatus === 'completed') {
      console.log('Setting child status to TRAINED - processing completed for this page');
      setDisplayStatus('trained');
      return;
    }

    // If child processing is completed but parent is still training, show "in_progress"
    if (childStatus === 'completed' && processingStatus === 'processed' && parentTrainingStatus === 'in_progress') {
      setDisplayStatus('in_progress');
      return;
    }
    
    // Default to original status
    setDisplayStatus(childStatus);
  };

  // Monitor child processing status and parent training status
  useEffect(() => {
    if (!parentSourceId || !pageId) {
      setDisplayStatus(status);
      return;
    }

    // Fetch initial child processing status and parent training status
    const fetchInitialState = async () => {
      const { data: childData } = await supabase
        .from('source_pages')
        .select('processing_status, status')
        .eq('id', pageId)
        .single();

      const { data: parentData } = await supabase
        .from('agent_sources')
        .select('metadata, crawl_status')
        .eq('id', parentSourceId)
        .single();
      
      if (childData && parentData) {
        const parentMetadata = (parentData.metadata as any) || {};
        const parentTrainingStatus = parentMetadata.training_status || 
          (parentData.crawl_status === 'training' ? 'in_progress' : 'pending');
        
        setChildProcessingStatus(childData.processing_status || 'pending');
        updateDisplayStatus(
          childData.status, 
          childData.processing_status || 'pending',
          parentTrainingStatus
        );
      } else {
        updateDisplayStatus(status, 'pending');
      }
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
          
          // Also fetch parent status when child updates
          supabase
            .from('agent_sources')
            .select('metadata, crawl_status')
            .eq('id', parentSourceId)
            .single()
            .then(({ data: parentData }) => {
              const parentMetadata = (parentData?.metadata as any) || {};
              const parentTrainingStatus = parentMetadata.training_status || 
                (parentData?.crawl_status === 'training' ? 'in_progress' : 'pending');
              
              updateDisplayStatus(updatedChild.status, newProcessingStatus, parentTrainingStatus);
            });
        }
      )
      .subscribe();

    // Subscribe to parent source training status changes
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
          const updatedParent = payload.new as any;
          console.log('Parent source training update:', updatedParent);
          const parentMetadata = (updatedParent.metadata as any) || {};
          const parentTrainingStatus = parentMetadata.training_status || 
            (updatedParent.crawl_status === 'training' ? 'in_progress' : 'pending');
          
          // Get current child status and update display
          supabase
            .from('source_pages')
            .select('processing_status, status')
            .eq('id', pageId)
            .single()
            .then(({ data: childData }) => {
              if (childData) {
                updateDisplayStatus(
                  childData.status, 
                  childData.processing_status || 'pending',
                  parentTrainingStatus
                );
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(childChannel);
      supabase.removeChannel(parentChannel);
    };
  }, [status, parentSourceId, pageId]);

  return {
    displayStatus,
    isLoading: displayStatus === 'in_progress' || displayStatus === 'pending'
  };
};
