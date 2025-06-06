
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseChildPageStatusProps {
  status: string;
  parentSourceId?: string;
  pageId?: string;
}

export const useChildPageStatus = ({ status, parentSourceId, pageId }: UseChildPageStatusProps) => {
  const [displayStatus, setDisplayStatus] = useState(status);
  const [parentTrainingState, setParentTrainingState] = useState<any>(null);
  const [childProcessingStatus, setChildProcessingStatus] = useState<string | null>(null);

  // Monitor both parent source training state AND child processing state
  useEffect(() => {
    if (!parentSourceId) {
      setDisplayStatus(status);
      return;
    }

    // Fetch initial parent state
    const fetchParentState = async () => {
      const { data } = await supabase
        .from('agent_sources')
        .select('crawl_status, metadata, requires_manual_training')
        .eq('id', parentSourceId)
        .single();
      
      if (data) {
        setParentTrainingState(data);
        updateDisplayStatus(status, childProcessingStatus, data);
      }
    };

    fetchParentState();

    // Subscribe to parent source changes
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
          console.log('Parent source update for child page:', updatedParent);
          setParentTrainingState(updatedParent);
          updateDisplayStatus(status, childProcessingStatus, updatedParent);
        }
      )
      .subscribe();

    // Listen for training completion events
    const handleTrainingCompleted = () => {
      console.log('Training completed event - updating child page status');
      fetchParentState();
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted);

    return () => {
      supabase.removeChannel(parentChannel);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
    };
  }, [status, parentSourceId, childProcessingStatus]);

  // Monitor child page processing status changes
  useEffect(() => {
    if (!pageId) return;

    // Fetch initial child processing status
    const fetchChildStatus = async () => {
      const { data } = await supabase
        .from('source_pages')
        .select('processing_status')
        .eq('id', pageId)
        .single();
      
      if (data) {
        setChildProcessingStatus(data.processing_status);
        updateDisplayStatus(status, data.processing_status, parentTrainingState);
      }
    };

    fetchChildStatus();

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
          setChildProcessingStatus(updatedChild.processing_status);
          updateDisplayStatus(status, updatedChild.processing_status, parentTrainingState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(childChannel);
    };
  }, [pageId, status, parentTrainingState]);

  const updateDisplayStatus = (childStatus: string, processingStatus: string | null, parentState: any) => {
    // Priority 1: If child is actively being processed (chunked), show "In Progress"
    if (processingStatus === 'processing') {
      setDisplayStatus('in_progress');
      return;
    }

    // Priority 2: If child processing is complete and parent training is done, show "Trained"
    if (processingStatus === 'processed' && parentState) {
      const metadata = (parentState.metadata as any) || {};
      
      if (metadata.training_completed_at || metadata.last_trained_at) {
        setDisplayStatus('trained');
        return;
      }
    }

    // Priority 3: If parent is currently training and child is completed, show "In Progress"
    if (parentState) {
      const metadata = (parentState.metadata as any) || {};
      
      if (parentState.crawl_status === 'training' || metadata.training_status === 'in_progress') {
        if (childStatus === 'completed') {
          setDisplayStatus('in_progress');
          return;
        }
      }
    }
    
    // Default to original status
    setDisplayStatus(childStatus);
  };

  return {
    displayStatus,
    parentTrainingState,
    childProcessingStatus
  };
};
