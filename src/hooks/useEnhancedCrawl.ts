
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedCrawlRequest {
  url: string;
  agentId: string;
  crawlMode?: 'single-page' | 'sitemap-only' | 'full-website';
  maxPages?: number;
  maxDepth?: number;
  excludePaths?: string[];
  includePaths?: string[];
  respectRobots?: boolean;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  priority?: 'normal' | 'high' | 'slow';
}

export const useEnhancedCrawl = () => {
  const [loading, setLoading] = useState(false);

  const initiateCrawl = async (request: EnhancedCrawlRequest) => {
    setLoading(true);
    
    try {
      console.log('🚀 Initiating enhanced crawl with request:', request);

      // Validate required fields
      if (!request.agentId || !request.url) {
        throw new Error('Missing required fields: agentId and url are required');
      }

      // Ensure priority is properly typed
      const priority: 'normal' | 'high' | 'slow' = request.priority || 'normal';

      // Call the enhanced-crawl-website edge function directly
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          url: request.url,
          agentId: request.agentId,
          crawlMode: request.crawlMode || 'full-website',
          maxPages: request.maxPages || 50,
          maxDepth: request.maxDepth || 3,
          excludePaths: request.excludePaths || [],
          includePaths: request.includePaths || [],
          respectRobots: request.respectRobots !== false,
          enableCompression: request.enableCompression !== false,
          enableDeduplication: request.enableDeduplication !== false,
          priority
        }
      });

      if (error) {
        console.error('❌ Enhanced crawl error:', error);
        throw error;
      }

      console.log('✅ Enhanced crawl initiated successfully:', data);
      
      // Show success message with compression info
      toast({
        title: "Crawl Started",
        description: `Started processing ${data.totalJobs} pages with compression enabled. Content will be fetched and compressed automatically.`,
      });
      
      return {
        parentSourceId: data.parentSourceId,
        totalJobs: data.totalJobs,
        message: `Enhanced crawl with compression initiated for ${data.totalJobs} pages`
      };

    } catch (error: any) {
      console.error('❌ Enhanced crawl error:', error);
      
      // Handle different types of errors with user-friendly messages
      let errorMessage = 'Failed to start enhanced crawl';
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error: Unable to connect to the crawl service. Please check your internet connection and try again.';
      } else if (error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
        errorMessage = 'Server resources temporarily unavailable. Please try again in a few moments.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait before starting another crawl.';
      } else if (error.message?.includes('authentication') || error.message?.includes('No API key')) {
        errorMessage = 'Authentication error. Please refresh the page and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show user-friendly toast message
      toast({
        title: "Crawl Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Add manual trigger for processing existing source pages
  const triggerProcessing = async () => {
    try {
      console.log('🔄 Manually triggering source page processing...');
      
      const { data, error } = await supabase.functions.invoke('process-source-pages');
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Processing Started",
        description: "Background processing of pending source pages has been triggered.",
      });
    } catch (error) {
      console.error('❌ Failed to trigger processing:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to start background processing. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add the missing properties that other components expect
  const isLoading = loading;
  
  const retryFailedJobs = async (parentSourceId: string) => {
    try {
      console.log('🔄 Retrying failed jobs for:', parentSourceId);
      
      // Get failed jobs and mark them for retry
      const { data: failedJobs, error: fetchError } = await supabase
        .from('source_pages')
        .select('id')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'failed');

      if (fetchError) {
        throw fetchError;
      }

      if (!failedJobs || failedJobs.length === 0) {
        toast({
          title: "No Failed Jobs",
          description: "No failed jobs found to retry.",
        });
        return 0;
      }

      // Reset failed jobs to pending for reprocessing
      const { error: updateError } = await supabase
        .from('source_pages')
        .update({ 
          status: 'pending',
          retry_count: 0,
          error_message: null
        })
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'failed');

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Successfully retried failed jobs:', failedJobs.length);
      toast({
        title: "Jobs Retried",
        description: `Successfully retried ${failedJobs.length} failed jobs.`,
      });

      return failedJobs.length;
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
      toast({
        title: "Retry Failed",
        description: "Failed to retry failed jobs. Please try again.",
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
    // This would typically fetch real-time crawl status
    // For now, return null to indicate no active status tracking
    console.log('📊 Getting active crawl status for:', parentSourceId);
    return null;
  };

  return {
    initiateCrawl,
    triggerProcessing,
    loading,
    isLoading,
    retryFailedJobs,
    getCrawlJobs,
    getActiveCrawlStatus
  };
};
