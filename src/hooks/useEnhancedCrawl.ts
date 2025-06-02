
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedCrawlRequest {
  url: string;
  agentId: string;
  crawlMode: 'single-page' | 'sitemap-only' | 'full-website';
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
      
      // Handle different types of errors
      let errorMessage = 'Failed to start enhanced crawl';
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error: Unable to connect to the crawl service. Please check your internet connection and try again.';
      } else if (error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
        errorMessage = 'Server resources temporarily unavailable. Please try again in a few moments.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    initiateCrawl,
    loading
  };
};
