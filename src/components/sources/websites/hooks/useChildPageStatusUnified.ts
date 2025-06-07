
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseChildPageStatusUnifiedProps {
  status: string;
  parentSourceId?: string;
  pageId?: string;
  initialStatus?: string;
}

export const useChildPageStatusUnified = ({ 
  status, 
  parentSourceId, 
  pageId, 
  initialStatus 
}: UseChildPageStatusUnifiedProps) => {
  const [displayStatus, setDisplayStatus] = useState(initialStatus || status);
  const [childProcessingStatus, setChildProcessingStatus] = useState<string>('pending');

  const updateDisplayStatus = (childStatus: string, processingStatus: string) => {
    console.log('Updating child display status:', {
      childStatus,
      processingStatus,
      pageId
    });

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

  // Monitor child processing status
  useEffect(() => {
    if (!parentSourceId || !pageId) {
      setDisplayStatus(status);
      return;
    }

    // Fetch initial child processing status
    const fetchInitialState = async () => {
      const { data: childData } = await supabase
        .from('source_pages')
        .select('processing_status, status')
        .eq('id', pageId)
        .single();
      
      if (childData) {
        setChildProcessingStatus(childData.processing_status || 'pending');
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
          
          updateDisplayStatus(updatedChild.status, newProcessingStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(childChannel);
    };
  }, [status, parentSourceId, pageId]);

  return {
    displayStatus,
    isLoading: displayStatus === 'in_progress' || displayStatus === 'pending'
  };
};
