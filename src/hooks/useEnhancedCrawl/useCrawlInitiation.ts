
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CrawlRecoveryService } from '@/services/rag/crawlRecoveryService';
import { EnhancedCrawlRequest, CrawlResult } from './types';

export const useCrawlInitiation = () => {
  const [loading, setLoading] = useState(false);

  const checkForExistingCrawl = async (url: string, agentId: string) => {
    try {
      // Normalize URL for comparison
      const normalizedUrl = url.replace(/\/+$/, '').toLowerCase();
      
      // Check if there's already an active or completed crawl for this URL
      const { data: existingSources, error } = await supabase
        .from('agent_sources')
        .select('id, crawl_status, url')
        .eq('agent_id', agentId)
        .eq('source_type', 'website')
        .eq('is_active', true);

      if (error) {
        console.error('Error checking existing crawls:', error);
        return null;
      }

      // Check for exact URL matches or very similar URLs
      const duplicateSource = existingSources?.find(source => {
        const existingUrl = source.url.replace(/\/+$/, '').toLowerCase();
        return existingUrl === normalizedUrl || 
               existingUrl === normalizedUrl + '/' ||
               normalizedUrl === existingUrl + '/';
      });

      return duplicateSource;
    } catch (error) {
      console.error('Error in checkForExistingCrawl:', error);
      return null;
    }
  };

  const initiateCrawl = async (request: EnhancedCrawlRequest): Promise<CrawlResult> => {
    setLoading(true);
    
    try {
      console.log('🚀 Initiating enhanced crawl with request:', request);

      if (!request.agentId || !request.url) {
        throw new Error('Missing required fields: agentId and url are required');
      }

      // Check for duplicate crawls
      const existingSource = await checkForExistingCrawl(request.url, request.agentId);
      
      if (existingSource) {
        console.log('🚫 Duplicate crawl detected:', existingSource);
        
        if (existingSource.crawl_status === 'completed') {
          toast({
            title: "Already Crawled",
            description: "This website has already been crawled successfully.",
          });
          throw new Error('This website has already been crawled');
        } else if (existingSource.crawl_status === 'in_progress') {
          toast({
            title: "Crawl in Progress",
            description: "This website is currently being crawled. Please wait for it to complete.",
          });
          throw new Error('This website is currently being crawled');
        }
      }

      const priority: 'normal' | 'high' | 'slow' = request.priority || 'normal';

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
      
      // Start automatic processing and monitoring
      setTimeout(() => {
        supabase.functions.invoke('process-source-pages').then(() => {
          console.log('🔄 Auto-triggered page processing');
        }).catch(err => {
          console.warn('⚠️ Auto-processing trigger failed:', err);
        });
        
        CrawlRecoveryService.autoRecoverStuckCrawls(request.agentId);
      }, 30000);

      setTimeout(() => {
        supabase.functions.invoke('generate-missing-chunks').then(() => {
          console.log('🔄 Auto-triggered missing chunks generation');
        }).catch(err => {
          console.warn('⚠️ Auto-chunk generation failed:', err);
        });
      }, 60000);
      
      toast({
        title: "Crawl Started",
        description: `Started processing ${data.totalJobs} pages with automatic chunk generation enabled. Content will be processed and made available to the AI automatically.`,
      });
      
      return {
        parentSourceId: data.parentSourceId,
        totalJobs: data.totalJobs,
        message: `Enhanced crawl with automatic chunk generation initiated for ${data.totalJobs} pages`
      };

    } catch (error: any) {
      console.error('❌ Enhanced crawl error:', error);
      
      let errorMessage = 'Failed to start enhanced crawl';
      
      if (error.message?.includes('already been crawled') || error.message?.includes('currently being crawled')) {
        errorMessage = error.message;
      } else if (error.message?.includes('Failed to fetch')) {
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
      
      if (!error.message?.includes('already been crawled') && !error.message?.includes('currently being crawled')) {
        toast({
          title: "Crawl Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    initiateCrawl,
    loading,
    isLoading: loading
  };
};
