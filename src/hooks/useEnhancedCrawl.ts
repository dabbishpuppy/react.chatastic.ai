
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
  priority?: string;
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

      // Call the enhanced crawl edge function with better error handling
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          agentId: request.agentId,
          url: request.url,
          crawlMode: request.crawlMode || 'full-website',
          maxPages: request.maxPages || 50,
          maxDepth: request.maxDepth || 3,
          excludePaths: request.excludePaths || [],
          includePaths: request.includePaths || [],
          respectRobots: request.respectRobots !== false,
          enableCompression: request.enableCompression !== false,
          enableDeduplication: request.enableDeduplication !== false,
          priority: request.priority || 'normal'
        }
      });

      if (error) {
        console.error('❌ Enhanced crawl API error:', error);
        
        // Handle specific error types
        if (error.message?.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.message?.includes('authentication')) {
          throw new Error('Authentication failed. Please refresh the page and try again.');
        } else if (error.message?.includes('No API key')) {
          throw new Error('API authentication error. Please contact support if this persists.');
        }
        
        throw new Error(`Crawl API error: ${error.message || 'Unknown error'}`);
      }

      if (!data || !data.success) {
        console.error('❌ Enhanced crawl failed:', data);
        throw new Error(data?.error || 'Enhanced crawl failed');
      }

      console.log('✅ Enhanced crawl initiated successfully:', data);
      
      return {
        parentSourceId: data.parentSourceId,
        totalJobs: data.totalJobs,
        message: data.message
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

  // Add the missing properties that other components expect
  const isLoading = loading;
  
  const retryFailedJobs = async (parentSourceId: string) => {
    try {
      console.log('🔄 Retrying failed jobs for:', parentSourceId);
      
      // Call edge function to retry failed jobs
      const { data, error } = await supabase.functions.invoke('retry-failed-jobs', {
        body: { parentSourceId }
      });

      if (error) {
        console.error('Failed to retry jobs:', error);
        toast({
          title: "Retry Failed",
          description: "Failed to retry failed jobs. Please try again.",
          variant: "destructive"
        });
        throw error;
      }

      console.log('✅ Successfully retried failed jobs:', data);
      toast({
        title: "Jobs Retried",
        description: `Successfully retried ${data?.retriedCount || 0} failed jobs.`,
      });

      return data?.retriedCount || 0;
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
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
    loading,
    isLoading,
    retryFailedJobs,
    getCrawlJobs,
    getActiveCrawlStatus
  };
};
