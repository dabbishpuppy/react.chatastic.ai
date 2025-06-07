
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
  const [parentTrainingStatus, setParentTrainingStatus] = useState<string>('unknown');

  const updateDisplayStatus = (childStatus: string, processingStatus: string, parentStatus: string) => {
    console.log('Updating child display status:', {
      childStatus,
      processingStatus,
      parentStatus,
      pageId
    });

    // Priority 1: If parent training is completed, show "trained" for completed children
    if (parentStatus === 'trained' && childStatus === 'completed') {
      console.log('Setting child status to TRAINED - parent training completed');
      setDisplayStatus('trained');
      return;
    }

    // Priority 2: If child is actively being processed (chunking), show "in_progress"
    if (processingStatus === 'processing') {
      setDisplayStatus('in_progress');
      return;
    }

    // Priority 3: If child processing is completed (chunked), show "trained" immediately
    if (childStatus === 'completed' && processingStatus === 'processed') {
      console.log('Setting child status to TRAINED - processing completed for this page');
      setDisplayStatus('trained');
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

    // Fetch initial state for both child and parent
    const fetchInitialState = async () => {
      // Get child page data
      const { data: childData } = await supabase
        .from('source_pages')
        .select('processing_status, status')
        .eq('id', pageId)
        .single();
      
      // Get parent source training status
      const { data: parentData } = await supabase
        .from('agent_sources')
        .select('crawl_status, metadata')
        .eq('id', parentSourceId)
        .single();
      
      if (childData) {
        const childProcessing = childData.processing_status || 'pending';
        setChildProcessingStatus(childProcessing);
        
        // Determine parent training status
        let parentStatus = 'unknown';
        if (parentData) {
          const metadata = parentData.metadata as any || {};
          
          // Check if parent training is completed
          if (metadata.training_completed_at || metadata.last_trained_at || parentData.crawl_status === 'trained') {
            parentStatus = 'trained';
          } else if (metadata.training_status === 'in_progress' || parentData.crawl_status === 'training') {
            parentStatus = 'training';
          } else if (parentData.crawl_status === 'completed') {
            parentStatus = 'ready_for_training';
          }
        }
        
        setParentTrainingStatus(parentStatus);
        updateDisplayStatus(childData.status, childProcessing, parentStatus);
      } else {
        updateDisplayStatus(status, 'pending', 'unknown');
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
          
          updateDisplayStatus(updatedChild.status, newProcessingStatus, parentTrainingStatus);
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
          
          const metadata = updatedParent.metadata as any || {};
          let newParentStatus = 'unknown';
          
          // Check if parent training is completed
          if (metadata.training_completed_at || metadata.last_trained_at || updatedParent.crawl_status === 'trained') {
            newParentStatus = 'trained';
          } else if (metadata.training_status === 'in_progress' || updatedParent.crawl_status === 'training') {
            newParentStatus = 'training';
          } else if (updatedParent.crawl_status === 'completed') {
            newParentStatus = 'ready_for_training';
          }
          
          setParentTrainingStatus(newParentStatus);
          
          // Re-evaluate display status with new parent status
          updateDisplayStatus(status, childProcessingStatus, newParentStatus);
        }
      )
      .subscribe();

    // Listen for training completion events from the window
    const handleTrainingCompleted = () => {
      console.log('Training completed event received - updating child status');
      setParentTrainingStatus('trained');
      updateDisplayStatus(status, childProcessingStatus, 'trained');
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted);

    return () => {
      supabase.removeChannel(childChannel);
      supabase.removeChannel(parentChannel);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
    };
  }, [status, parentSourceId, pageId, childProcessingStatus, parentTrainingStatus]);

  return {
    displayStatus,
    isLoading: displayStatus === 'in_progress' || displayStatus === 'pending'
  };
};
