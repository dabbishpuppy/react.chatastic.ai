
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseChildPageStatusUnifiedProps {
  pageId: string;
  parentSourceId: string;
  initialStatus: string;
}

export const useChildPageStatusUnified = ({ 
  pageId, 
  parentSourceId, 
  initialStatus 
}: UseChildPageStatusUnifiedProps) => {
  const [displayStatus, setDisplayStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  // Unified status determination logic - single source of truth
  const determineDisplayStatus = useCallback((
    pageStatus: string,
    processingStatus: string,
    parentRecrawlStatus: string,
    timestamp: number
  ) => {
    // Prevent rapid fire updates
    if (timestamp - lastUpdateTime < 50) {
      return displayStatus;
    }

    console.log('🎯 Unified status determination:', {
      pageId,
      pageStatus,
      processingStatus,
      parentRecrawlStatus,
      timestamp
    });

    // PRIORITY 1: Parent recrawling overrides everything
    if (parentRecrawlStatus === 'recrawling') {
      console.log('🔄 Parent recrawling - showing recrawling');
      return 'recrawling';
    }

    // PRIORITY 2: Use page status as primary indicator (this is the user-visible state)
    // Only use processing_status for internal chunking phase
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'trained'];
    const primaryStatus = validStatuses.includes(pageStatus) ? pageStatus : 'pending';

    // PRIORITY 3: Special handling for completed pages that are being processed for chunks
    if (primaryStatus === 'completed' && processingStatus === 'processing') {
      console.log('📝 Page completed, chunks being processed - staying completed');
      return 'completed'; // Don't show intermediate processing state
    }

    // PRIORITY 4: Training state transition
    if (primaryStatus === 'completed' && processingStatus === 'processed') {
      console.log('🎓 Page ready for training - showing trained');
      return 'trained';
    }

    console.log('📊 Using primary status:', primaryStatus);
    return primaryStatus;
  }, [pageId, displayStatus, lastUpdateTime]);

  useEffect(() => {
    if (!pageId || !parentSourceId) return;

    console.log(`📡 Setting up unified status tracking for child page: ${pageId}`);

    // Fetch initial state
    const fetchInitialState = async () => {
      try {
        // Get child page data
        const { data: pageData } = await supabase
          .from('source_pages')
          .select('status, processing_status')
          .eq('id', pageId)
          .single();
        
        // Get parent recrawl status
        const { data: parentData } = await supabase
          .from('agent_sources')
          .select('crawl_status, metadata')
          .eq('id', parentSourceId)
          .single();
        
        if (pageData && parentData) {
          const metadata = parentData.metadata as Record<string, any> | null;
          const isParentRecrawling = parentData.crawl_status === 'recrawling' || 
                                    (metadata && metadata.is_recrawling === true);
          const parentRecrawlStatus = isParentRecrawling ? 'recrawling' : '';
          
          const timestamp = Date.now();
          const newStatus = determineDisplayStatus(
            pageData.status,
            pageData.processing_status || 'pending',
            parentRecrawlStatus,
            timestamp
          );
          
          console.log('📊 Initial status determined:', newStatus);
          setDisplayStatus(newStatus);
          setIsLoading(newStatus === 'pending' || newStatus === 'in_progress' || newStatus === 'recrawling');
          setLastUpdateTime(timestamp);
        }
      } catch (error) {
        console.error('❌ Error fetching initial state:', error);
      }
    };

    fetchInitialState();

    // Single unified realtime subscription for this child page
    const unifiedChannel = supabase
      .channel(`unified-child-status-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
          filter: `id=eq.${pageId}`
        },
        (payload) => {
          const updatedPage = payload.new as any;
          console.log('📡 Child page realtime update:', {
            pageId,
            oldStatus: payload.old?.status,
            newStatus: updatedPage.status,
            oldProcessingStatus: payload.old?.processing_status,
            newProcessingStatus: updatedPage.processing_status
          });
          
          // Only process if status actually changed
          if (payload.old?.status !== updatedPage.status || 
              payload.old?.processing_status !== updatedPage.processing_status) {
            
            const timestamp = Date.now();
            const newStatus = determineDisplayStatus(
              updatedPage.status,
              updatedPage.processing_status || 'pending',
              '', // Parent status handled separately
              timestamp
            );
            
            console.log('📡 Status update result:', {
              oldDisplayStatus: displayStatus,
              newDisplayStatus: newStatus
            });
            
            setDisplayStatus(newStatus);
            setIsLoading(newStatus === 'pending' || newStatus === 'in_progress' || newStatus === 'recrawling');
            setLastUpdateTime(timestamp);
          }
        }
      )
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
          console.log('📡 Parent source realtime update for child:', {
            pageId,
            parentId: parentSourceId,
            crawlStatus: updatedParent.crawl_status,
            metadata: updatedParent.metadata
          });
          
          const metadata = updatedParent.metadata as Record<string, any> | null;
          const isParentRecrawling = updatedParent.crawl_status === 'recrawling' || 
                                    (metadata && metadata.is_recrawling === true);
          const parentRecrawlStatus = isParentRecrawling ? 'recrawling' : '';
          
          const timestamp = Date.now();
          const newStatus = determineDisplayStatus(
            displayStatus, // Keep current page status
            'pending', // Don't change processing status from parent update
            parentRecrawlStatus,
            timestamp
          );
          
          if (newStatus !== displayStatus) {
            console.log('📡 Parent update changed child status:', {
              from: displayStatus,
              to: newStatus
            });
            setDisplayStatus(newStatus);
            setIsLoading(newStatus === 'pending' || newStatus === 'in_progress' || newStatus === 'recrawling');
            setLastUpdateTime(timestamp);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Unified subscription status for ${pageId}:`, status);
      });

    return () => {
      console.log(`🔌 Cleaning up unified subscription for page: ${pageId}`);
      supabase.removeChannel(unifiedChannel);
    };
  }, [pageId, parentSourceId, determineDisplayStatus]);

  console.log('🎯 Unified hook result:', { 
    pageId,
    displayStatus, 
    isLoading,
    timestamp: new Date().toISOString()
  });

  return {
    displayStatus,
    isLoading
  };
};
