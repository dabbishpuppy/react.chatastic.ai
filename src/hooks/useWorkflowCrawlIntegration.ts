
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { WorkflowCrawlIntegration } from '@/services/workflow/WorkflowCrawlIntegration';
import { AgentSource } from '@/types/rag';

export const useWorkflowCrawlIntegration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const initiateWebsiteCrawl = async (
    agentId: string,
    sourceId: string,
    url: string,
    options?: {
      crawlMode?: 'single-page' | 'sitemap-only' | 'full-website';
      maxPages?: number;
      maxDepth?: number;
      respectRobots?: boolean;
      includePaths?: string[];
      excludePaths?: string[];
    }
  ) => {
    setIsLoading(true);
    try {
      await WorkflowCrawlIntegration.initiateWebsiteCrawl(agentId, sourceId, url, options);
      toast({
        title: 'Crawl Started',
        description: 'Website crawl has been initiated successfully.',
      });
    } catch (error) {
      console.error('Error initiating crawl:', error);
      toast({
        title: 'Crawl Failed',
        description: 'Failed to start website crawl. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const initiateTraining = async (sourceId: string) => {
    setIsLoading(true);
    try {
      await WorkflowCrawlIntegration.initiateTraining(sourceId);
      toast({
        title: 'Training Started',
        description: 'Source training has been initiated successfully.',
      });
    } catch (error) {
      console.error('Error initiating training:', error);
      toast({
        title: 'Training Failed',
        description: 'Failed to start training. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const markSourceForRemoval = async (source: AgentSource) => {
    setIsLoading(true);
    try {
      await WorkflowCrawlIntegration.markSourceForRemoval(source);
      toast({
        title: 'Source Marked for Removal',
        description: 'Source has been marked for removal and will be processed in the background.',
      });
    } catch (error) {
      console.error('Error marking source for removal:', error);
      toast({
        title: 'Removal Failed',
        description: 'Failed to mark source for removal. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const restoreSource = async (source: AgentSource) => {
    setIsLoading(true);
    try {
      await WorkflowCrawlIntegration.restoreSource(source);
      toast({
        title: 'Source Restored',
        description: 'Source has been restored successfully.',
      });
    } catch (error) {
      console.error('Error restoring source:', error);
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore source. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    initiateWebsiteCrawl,
    initiateTraining,
    markSourceForRemoval,
    restoreSource,
    isLoading
  };
};
