
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { CrawlApiService } from '@/services/rag/enhanced/crawlApi';
import { EnhancedCrawlService } from '@/services/rag/enhanced/enhancedCrawlService';
import type { EnhancedCrawlRequest } from '@/services/rag/enhanced/crawlTypes';

export const useCrawlInitiation = () => {
  const [loading, setLoading] = useState(false);

  const initiateCrawl = async (request: EnhancedCrawlRequest) => {
    setLoading(true);
    
    try {
      console.log('🚀 Initiating enhanced crawl with request:', request);
      
      // Dispatch crawl started event to suppress connection warnings
      window.dispatchEvent(new CustomEvent('crawlStarted', {
        detail: { agentId: request.agentId, url: request.url }
      }));
      
      const result = await CrawlApiService.initiateCrawl(request);
      
      console.log('✅ Enhanced crawl initiated successfully:', result);
      
      // Show success toast
      toast({
        title: "Crawl Started",
        description: `Discovering and crawling ${request.url}...`,
        duration: 3000,
      });
      
      // Start source page processing after a brief delay
      setTimeout(async () => {
        try {
          const processingResult = await EnhancedCrawlService.startSourcePageProcessing();
          console.log('🔄 Source page processing started:', processingResult);
        } catch (error) {
          console.warn('⚠️ Source page processing warning (may be normal):', error);
        }
      }, 2000);
      
      // Dispatch crawl completed event after a delay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('crawlCompleted', {
          detail: { agentId: request.agentId, parentSourceId: result.parentSourceId }
        }));
      }, 10000); // 10 second delay to allow initial setup to complete
      
      return result;
      
    } catch (error) {
      console.error('❌ Enhanced crawl initiation failed:', error);
      
      // Dispatch crawl completed event even on failure to clear flags
      window.dispatchEvent(new CustomEvent('crawlCompleted', {
        detail: { agentId: request.agentId, error: true }
      }));
      
      toast({
        title: "Crawl Failed",
        description: error instanceof Error ? error.message : "Failed to start crawl",
        variant: "destructive",
      });
      
      throw error;
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
