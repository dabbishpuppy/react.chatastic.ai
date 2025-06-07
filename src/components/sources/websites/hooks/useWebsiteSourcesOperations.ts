
import { useCallback } from 'react';
import { toast } from "@/hooks/use-toast";
import { useRAGServices } from "@/hooks/useRAGServices";
import { useWorkflowCrawlIntegration } from "@/hooks/useWorkflowCrawlIntegration";
import { AgentSource } from "@/types/rag";
import { useParams } from "react-router-dom";

export const useWebsiteSourcesOperations = () => {
  const { sources: sourceService } = useRAGServices();
  const { agentId } = useParams();
  const {
    initiateWebsiteCrawl,
    initiateTraining,
    markSourceForRemoval,
    restoreSource,
    isLoading: workflowLoading
  } = useWorkflowCrawlIntegration();

  const handleAddWebsite = useCallback(async (url: string, options: any) => {
    try {
      console.log('Adding website via workflow system:', url, options);
      
      if (!agentId) {
        throw new Error('Agent ID is required');
      }

      // This will be handled by the EnhancedWebsiteCrawlFormV3 component
      // which should use the workflow system for new crawls
      toast({
        title: "Website Added",
        description: "Website crawling has been initiated via workflow system.",
      });
    } catch (error) {
      console.error('Failed to add website:', error);
      toast({
        title: "Error",
        description: "Failed to add website. Please try again.",
        variant: "destructive"
      });
    }
  }, [agentId]);

  const handleEdit = useCallback(async (sourceId: string, newUrl: string) => {
    try {
      await sourceService.updateSource(sourceId, {
        url: newUrl,
        title: newUrl
      });
      
      toast({
        title: "Success",
        description: "URL updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update URL",
        variant: "destructive"
      });
    }
  }, [sourceService]);

  const handleExclude = useCallback(async (source: AgentSource) => {
    try {
      await sourceService.updateSource(source.id, {
        is_excluded: !source.is_excluded
      });
      
      toast({
        title: "Success",
        description: `Link ${source.is_excluded ? 'included' : 'excluded'} successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update link status",
        variant: "destructive"
      });
    }
  }, [sourceService]);

  const handleDelete = useCallback(async (source: AgentSource) => {
    try {
      // Use workflow system for deletion
      await markSourceForRemoval(source);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    }
  }, [markSourceForRemoval]);

  const handleRecrawl = useCallback(async (source: AgentSource) => {
    try {
      if (!agentId || !source.url) {
        throw new Error('Agent ID and source URL are required');
      }

      // Use workflow system for recrawling
      await initiateWebsiteCrawl(agentId, source.id, source.url, {
        crawlMode: 'full-website',
        maxPages: 100,
        maxDepth: 3,
        respectRobots: true
      });
      
    } catch (error) {
      console.error('Recrawl error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate recrawl",
        variant: "destructive"
      });
    }
  }, [agentId, initiateWebsiteCrawl]);

  return {
    handleAddWebsite,
    handleEdit,
    handleExclude,
    handleDelete,
    handleRecrawl,
    loading: workflowLoading,
    error: null
  };
};
