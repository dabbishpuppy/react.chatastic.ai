
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CrawlRecoveryService } from '@/services/rag/crawlRecoveryService';
import { EnhancedCrawlRequest, CrawlResult } from './types';

export const useCrawlInitiation = () => {
  const [loading, setLoading] = useState(false);

  const initiateCrawl = async (request: EnhancedCrawlRequest): Promise<CrawlResult> => {
    setLoading(true);
    
    try {
      console.log('🚀 Initiating enhanced crawl with request:', request);

      if (!request.agentId || !request.url) {
        throw new Error('Missing required fields: agentId and url are required');
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

  return {
    initiateCrawl,
    loading,
    isLoading: loading
  };
};
