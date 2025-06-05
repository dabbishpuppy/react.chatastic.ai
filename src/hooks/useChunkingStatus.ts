
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChunkingStatus {
  pagesProcessed: number;
  totalPages: number;
  isComplete: boolean;
  progressPercentage: number;
  error?: string;
  isLoading: boolean;
}

export const useChunkingStatus = (parentSourceId: string | null) => {
  const [status, setStatus] = useState<ChunkingStatus>({
    pagesProcessed: 0,
    totalPages: 0,
    isComplete: false,
    progressPercentage: 0,
    isLoading: false
  });

  const calculateProgress = useCallback(async () => {
    if (!parentSourceId) return;

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: undefined }));

      // Get total pages that need processing
      const { data: totalPagesData, error: totalError } = await supabase
        .from('source_pages')
        .select('id')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'completed');

      if (totalError) {
        console.error('Error fetching total pages:', totalError);
        setStatus(prev => ({ ...prev, error: totalError.message, isLoading: false }));
        return;
      }

      const totalPages = totalPagesData?.length || 0;
      console.log(`📊 Found ${totalPages} completed pages for chunking status`);

      if (totalPages === 0) {
        setStatus({
          pagesProcessed: 0,
          totalPages: 0,
          isComplete: false,
          progressPercentage: 0,
          error: 'No completed pages found',
          isLoading: false
        });
        return;
      }

      // Get pages that have been processed (have chunks)
      const { data: chunksData, error: chunksError } = await supabase
        .from('source_chunks')
        .select('source_id')
        .in('source_id', totalPagesData?.map(p => p.id) || []);

      if (chunksError) {
        console.error('Error fetching processed chunks:', chunksError);
        setStatus(prev => ({ ...prev, error: chunksError.message, isLoading: false }));
        return;
      }

      // Count unique source_ids that have chunks
      const uniqueProcessedSources = new Set(chunksData?.map(c => c.source_id) || []);
      const pagesProcessed = uniqueProcessedSources.size;

      console.log(`📝 Processed pages: ${pagesProcessed}/${totalPages}`);

      const progressPercentage = totalPages > 0 ? Math.round((pagesProcessed / totalPages) * 100) : 0;
      const isComplete = pagesProcessed >= totalPages && totalPages > 0;

      setStatus({
        pagesProcessed,
        totalPages,
        isComplete,
        progressPercentage,
        isLoading: false
      });

    } catch (error) {
      console.error('Error calculating chunking progress:', error);
      setStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      }));
    }
  }, [parentSourceId]);

  useEffect(() => {
    if (!parentSourceId) return;

    // Initial calculation
    calculateProgress();

    // Set up real-time subscription without prevention blocks
    const channel = supabase
      .channel(`chunking-progress-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'source_chunks'
        },
        (payload) => {
          console.log('📡 New chunk created:', payload);
          // Force immediate recalculation without delays
          setTimeout(calculateProgress, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Page status updated:', payload);
          // Force immediate recalculation without delays
          setTimeout(calculateProgress, 100);
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Chunking subscription status:', status);
        if (err) {
          console.error('📡 Subscription error:', err);
          setStatus(prev => ({ ...prev, error: `Subscription error: ${err.message}` }));
        }
      });

    // Set up a polling mechanism as backup in case real-time fails
    const pollInterval = setInterval(() => {
      calculateProgress();
    }, 5000); // Poll every 5 seconds

    return () => {
      console.log('🧹 Cleaning up chunking subscription');
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [parentSourceId, calculateProgress]);

  return status;
};
