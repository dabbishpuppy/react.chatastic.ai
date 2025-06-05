
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface SinglePageCrawlResult {
  parentSourceId: string;
  pageId: string;
}

export const useSinglePageCrawl = () => {
  const { agentId } = useParams();
  const [isLoading, setIsLoading] = useState(false);

  const startSinglePageCrawl = useCallback(async (url: string): Promise<SinglePageCrawlResult> => {
    if (!agentId) throw new Error('Agent ID is required');
    
    setIsLoading(true);
    
    try {
      // Call the enhanced crawl function with single-page mode
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          agentId,
          url,
          crawlMode: 'single-page',
          maxPages: 1
        }
      });

      if (error) {
        throw new Error(`Crawl failed: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown crawl error');
      }

      const parentSourceId = data.parentSourceId;

      // Set up real-time subscription to wait for completion with increased timeout
      return new Promise((resolve, reject) => {
        let hasResolved = false;
        
        const channel = supabase
          .channel(`single-page-crawl-${parentSourceId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'source_pages',
              filter: `parent_source_id=eq.${parentSourceId}`
            },
            (payload) => {
              if (hasResolved) return;
              
              const updatedPage = payload.new as any;
              
              if (updatedPage.status === 'completed') {
                hasResolved = true;
                // Page crawling is complete
                toast({
                  title: "Crawling Finished",
                  duration: 3000,
                });
                
                channel.unsubscribe();
                resolve({
                  parentSourceId,
                  pageId: updatedPage.id
                });
              } else if (updatedPage.status === 'failed') {
                hasResolved = true;
                channel.unsubscribe();
                reject(new Error(`Page crawling failed: ${updatedPage.error_message || 'Unknown error'}`));
              }
            }
          )
          .subscribe();

        // Increased timeout to 5 minutes for single page crawls
        setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            channel.unsubscribe();
            reject(new Error('Crawl timeout - the page took too long to process'));
          }
        }, 300000); // 5 minutes instead of 2 minutes
      });

    } catch (error) {
      console.error('Single page crawl error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  return {
    startSinglePageCrawl,
    isLoading
  };
};
