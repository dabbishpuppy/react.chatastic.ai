
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
  const [childProcessingStatus, setChildProcessingStatus] = useState<string>('pending');

  const updateDisplayStatus = (childStatus: string, parentState: any, processingStatus: string) => {
    console.log('Updating child display status:', {
      childStatus,
      processingStatus,
      parentState: parentState?.metadata
    });

    // If child is actively being processed (chunking), show "In Progress"
    if (processingStatus === 'processing') {
      setDisplayStatus('in_progress');
      return;
    }

    // If child processing is completed (chunked) and parent has training metadata, show "Trained"
    if (childStatus === 'completed' && processingStatus === 'processed' && parentState) {
      const metadata = (parentState.metadata as any) || {};
      
      // If parent training is completed, show "Trained"
      if (metadata.training_completed_at || metadata.last_trained_at) {
        console.log('Setting child status to TRAINED - parent has training metadata');
        setDisplayStatus('trained');
        return;
      }
      
      // If parent is currently training, show "In Progress"
      if (parentState.crawl_status === 'training' || metadata.training_status === 'in_progress') {
        setDisplayStatus('in_progress');
        return;
      }
    }
    
    // If child is completed and processed, but parent has no training metadata yet, show "Completed"
    if (childStatus === 'completed' && processingStatus === 'processed') {
      console.log('Setting child status to COMPLETED - no parent training metadata yet');
      setDisplayStatus('completed');
      return;
    }
    
    // Default to original status
    setDisplayStatus(childStatus);
  };

  // Monitor both parent training state AND child processing status
  useEffect(() => {
    if (!parentSourceId || !pageId) {
      setDisplayStatus(status);
      return;
    }

    // Fetch initial states
    const fetchInitialStates = async () => {
      // Get parent state
      const { data: parentData } = await supabase
        .from('agent_sources')
        .select('crawl_status, metadata, requires_manual_training')
        .eq('id', parentSourceId)
        .single();
      
      // Get child processing status
      const { data: childData } = await supabase
        .from('source_pages')
        .select('processing_status, status')
        .eq('id', pageId)
        .single();
      
      if (parentData) {
        setParentTrainingState(parentData);
      }
      
      if (childData) {
        setChildProcessingStatus(childData.processing_status || 'pending');
        updateDisplayStatus(childData.status, parentData, childData.processing_status || 'pending');
      } else {
        updateDisplayStatus(status, parentData, 'pending');
      }
    };

    fetchInitialStates();

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
          updateDisplayStatus(status, updatedParent, childProcessingStatus);
        }
      )
      .subscribe();

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
          
          updateDisplayStatus(updatedChild.status, parentTrainingState, newProcessingStatus);
        }
      )
      .subscribe();

    // Listen for training completion events
    const handleTrainingCompleted = () => {
      console.log('Training completed event - updating child page status');
      fetchInitialStates();
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted);

    return () => {
      supabase.removeChannel(parentChannel);
      supabase.removeChannel(childChannel);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
    };
  }, [status, parentSourceId, pageId, childProcessingStatus, parentTrainingState]);

  return {
    displayStatus,
    isLoading: displayStatus === 'in_progress' || displayStatus === 'pending'
  };
};
