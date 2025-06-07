
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
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
        title: "Crawl Started",
        description: "Website crawling has been initiated successfully.",
      });
    } catch (error) {
      console.error('Error initiating crawl:', error);
      toast({
        title: "Crawl Failed",
        description: error instanceof Error ? error.message : "Failed to start crawl",
        variant: "destructive",
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
        title: "Training Started",
        description: "Source training has been initiated successfully.",
      });
    } catch (error) {
      console.error('Error initiating training:', error);
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "Failed to start training",
        variant: "destructive",
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
        title: "Source Marked for Removal",
        description: "The source has been marked for removal and will be deleted shortly.",
      });
    } catch (error) {
      console.error('Error marking source for removal:', error);
      toast({
        title: "Removal Failed",
        description: error instanceof Error ? error.message : "Failed to mark source for removal",
        variant: "destructive",
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
        title: "Source Restored",
        description: "The source has been successfully restored.",
      });
    } catch (error) {
      console.error('Error restoring source:', error);
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore source",
        variant: "destructive",
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
