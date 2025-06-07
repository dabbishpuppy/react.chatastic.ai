
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';
import { CrawlWorkflowService } from '@/services/workflow/CrawlWorkflowService';
import { useOptimisticWebsiteCrawl } from './useOptimisticWebsiteCrawl';

interface WorkflowCrawlData {
  url: string;
  crawlMode: 'single-page' | 'sitemap-only' | 'full-website';
  maxPages: number;
  maxDepth: number;
  respectRobots: boolean;
  includePaths: string[];
  excludePaths: string[];
}

export const useEnhancedWorkflowCrawl = () => {
  const { agentId } = useParams();
  const { submitWebsite } = useOptimisticWebsiteCrawl();

  const mutation = useMutation({
    mutationFn: async (data: WorkflowCrawlData & { clientId: string }) => {
      console.log('🚀 Starting enhanced workflow crawl with clientId:', data.clientId);
      
      // First use the existing optimistic crawl to create the source
      const result = await submitWebsite({
        url: data.url,
        crawlMode: data.crawlMode,
        maxPages: data.maxPages,
        maxDepth: data.maxDepth,
        respectRobots: data.respectRobots,
        includePaths: data.includePaths,
        excludePaths: data.excludePaths
      });

      if (result?.parentSourceId) {
        // Now start the workflow for the created source
        await CrawlWorkflowService.startCrawl(result.parentSourceId, {
          url: data.url,
          crawlMode: data.crawlMode,
          maxPages: data.maxPages,
          maxDepth: data.maxDepth,
          respectRobots: data.respectRobots,
          includePaths: data.includePaths,
          excludePaths: data.excludePaths
        });
      }

      return result;
    },

    onSuccess: (result, variables) => {
      console.log('🎉 Enhanced workflow crawl initiated successfully:', result);
      
      toast({
        title: "Enhanced Crawl Started",
        description: `Workflow-driven crawling initiated for ${variables.url}`
      });
    },

    onError: (error, variables) => {
      console.error('❌ Enhanced workflow crawl failed:', error);
      
      toast({
        title: "Enhanced Crawl Failed",
        description: error instanceof Error ? error.message : "Failed to start enhanced workflow crawl",
        variant: "destructive"
      });
    }
  });

  const submitEnhancedCrawl = async (data: WorkflowCrawlData) => {
    if (!agentId) return;

    const clientId = uuidv4();
    
    console.log('🎯 Starting enhanced workflow crawl submission with clientId:', clientId);

    return mutation.mutateAsync({
      ...data,
      clientId
    });
  };

  return {
    submitEnhancedCrawl,
    isSubmitting: mutation.isPending,
    error: mutation.error
  };
};
