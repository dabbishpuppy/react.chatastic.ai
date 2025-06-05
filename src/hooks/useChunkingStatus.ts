
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChunkingStatus {
  pagesProcessed: number;
  totalPages: number;
  isComplete: boolean;
  progressPercentage: number;
}

export const useChunkingStatus = (parentSourceId: string | null) => {
  const [status, setStatus] = useState<ChunkingStatus>({
    pagesProcessed: 0,
    totalPages: 0,
    isComplete: false,
    progressPercentage: 0
  });

  const calculateProgress = useCallback(async () => {
    if (!parentSourceId) return;

    try {
      // Get total pages that need processing
      const { data: totalPagesData, error: totalError } = await supabase
        .from('source_pages')
        .select('id', { count: 'exact' })
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'completed');

      if (totalError) {
        console.error('Error fetching total pages:', totalError);
        return;
      }

      const totalPages = totalPagesData?.length || 0;

      // Get pages that have been processed (have chunks)
      const { data: processedPagesData, error: processedError } = await supabase
        .from('source_chunks')
        .select('source_id', { count: 'exact' })
        .in('source_id', totalPagesData?.map(p => p.id) || []);

      if (processedError) {
        console.error('Error fetching processed pages:', processedError);
        return;
      }

      // Count unique source_ids that have chunks
      const uniqueProcessedSources = new Set(processedPagesData?.map(c => c.source_id) || []);
      const pagesProcessed = uniqueProcessedSources.size;

      const progressPercentage = totalPages > 0 ? Math.round((pagesProcessed / totalPages) * 100) : 0;
      const isComplete = pagesProcessed >= totalPages && totalPages > 0;

      setStatus({
        pagesProcessed,
        totalPages,
        isComplete,
        progressPercentage
      });

    } catch (error) {
      console.error('Error calculating chunking progress:', error);
    }
  }, [parentSourceId]);

  useEffect(() => {
    if (!parentSourceId) return;

    // Initial calculation
    calculateProgress();

    // Set up real-time subscription for source_chunks
    const channel = supabase
      .channel(`chunking-progress-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'source_chunks'
        },
        () => {
          // Recalculate when new chunks are created
          calculateProgress();
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
        () => {
          // Recalculate when page status changes
          calculateProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentSourceId, calculateProgress]);

  return status;
};
