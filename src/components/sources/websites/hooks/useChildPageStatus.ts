
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

    // If child is actively being processed (chunking), show "In Progress"
    if (processingStatus === 'processing') {
      setDisplayStatus('in_progress');
      return;
    }

    // If child processing is completed (chunked) AND parent training is completed, show "Trained"
    if (childStatus === 'completed' && processingStatus === 'processed') {
      // Check if parent has completed training
      if (parentTrainingStatus === 'trained' || parentTrainingStatus === 'training_completed') {
        console.log('Setting child status to TRAINED - parent training completed');
        setDisplayStatus('trained');
        return;
      }
      // If parent training not completed yet, show as completed
      setDisplayStatus('completed');
      return;
    }
    
    // Default to original status
    setDisplayStatus(childStatus);
  };

  // Monitor both child processing status and parent training status
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
      
      // Get parent source training status
      const { data: parentData } = await supabase
        .from('agent_sources')
        .select('metadata, crawl_status')
        .eq('id', parentSourceId)
        .single();
      
      if (childData && parentData) {
        const childProcessingStatus = childData.processing_status || 'pending';
        const parentTrainingStatus = parentData.metadata?.training_status || parentData.crawl_status;
        
        setChildProcessingStatus(childProcessingStatus);
        updateDisplayStatus(childData.status, childProcessingStatus, parentTrainingStatus);
      } else if (childData) {
        updateDisplayStatus(childData.status, childData.processing_status || 'pending');
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
          
          // Also get current parent status for accurate display
          supabase
            .from('agent_sources')
            .select('metadata, crawl_status')
            .eq('id', parentSourceId)
            .single()
            .then(({ data: parentData }) => {
              const parentTrainingStatus = parentData?.metadata?.training_status || parentData?.crawl_status;
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
          const parentTrainingStatus = updatedParent.metadata?.training_status || updatedParent.crawl_status;
          
          // Get current child status to update display
          supabase
            .from('source_pages')
            .select('processing_status, status')
            .eq('id', pageId)
            .single()
            .then(({ data: childData }) => {
              if (childData) {
                updateDisplayStatus(childData.status, childData.processing_status || 'pending', parentTrainingStatus);
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
