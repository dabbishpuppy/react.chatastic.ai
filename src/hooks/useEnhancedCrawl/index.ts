
import { useCrawlInitiation } from './useCrawlInitiation';
import { CrawlRecoveryService } from '@/services/rag/crawlRecoveryService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export * from './types';

export const useEnhancedCrawl = () => {
  const { initiateCrawl, loading, isLoading } = useCrawlInitiation();

  const retryFailedJobs = async (parentSourceId: string) => {
    try {
      console.log('🔄 Auto-retrying failed jobs for:', parentSourceId);
      
      const result = await CrawlRecoveryService.autoRetryFailedPages(parentSourceId);
      
      if (result.success) {
        setTimeout(() => {
          supabase.functions.invoke('generate-missing-chunks').then(() => {
            console.log('🔄 Auto-triggered chunk generation after retry');
          }).catch(err => {
            console.warn('⚠️ Auto-chunk generation failed after retry:', err);
          });
        }, 5000);
        
        toast({
          title: "Auto-Retry Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Auto-Retry Issue",
          description: result.message,
          variant: "destructive"
        });
      }

      return result.retriedCount || 0;
    } catch (error) {
      console.error('Error auto-retrying failed jobs:', error);
      toast({
        title: "Auto-Retry Failed",
        description: "Automatic retry encountered an issue. The system will try again later.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getCrawlJobs = async (parentSourceId: string) => {
    try {
      console.log('📋 Getting crawl jobs for:', parentSourceId);
      
      const { data, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('parent_source_id', parentSourceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch crawl jobs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting crawl jobs:', error);
      return [];
    }
  };

  const getActiveCrawlStatus = (parentSourceId: string) => {
    console.log('📊 Getting active crawl status for:', parentSourceId);
    return null;
  };

  return {
    initiateCrawl,
    loading,
    isLoading,
    retryFailedJobs,
    getCrawlJobs,
    getActiveCrawlStatus
  };
};
