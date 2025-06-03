
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CrawlRecoveryService } from '@/services/rag/crawlRecoveryService';

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
      
      // Automatically start monitoring and processing
      setTimeout(() => {
        // Trigger automatic processing of pending pages
        supabase.functions.invoke('process-source-pages').then(() => {
          console.log('🔄 Auto-triggered page processing');
        }).catch(err => {
          console.warn('⚠️ Auto-processing trigger failed:', err);
        });
        
        // Start recovery monitoring
        CrawlRecoveryService.autoRecoverStuckCrawls(request.agentId);
      }, 30000); // Check for issues after 30 seconds

      // Schedule periodic chunk generation checks
      setTimeout(() => {
        supabase.functions.invoke('generate-missing-chunks').then(() => {
          console.log('🔄 Auto-triggered missing chunks generation');
        }).catch(err => {
          console.warn('⚠️ Auto-chunk generation failed:', err);
        });
      }, 60000); // Check for missing chunks after 1 minute
      
      // Show success message with automatic processing info
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

  const retryFailedJobs = async (parentSourceId: string) => {
    try {
      console.log('🔄 Auto-retrying failed jobs for:', parentSourceId);
      
      const result = await CrawlRecoveryService.autoRetryFailedPages(parentSourceId);
      
      if (result.success) {
        // Also trigger chunk generation for any completed pages without chunks
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
    // This would typically fetch real-time crawl status
    // For now, return null to indicate no active status tracking
    console.log('📊 Getting active crawl status for:', parentSourceId);
    return null;
  };

  // Add the missing properties that other components expect
  const isLoading = loading;

  return {
    initiateCrawl,
    loading,
    isLoading,
    retryFailedJobs,
    getCrawlJobs,
    getActiveCrawlStatus
  };
};
