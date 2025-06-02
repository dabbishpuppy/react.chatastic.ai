
import { useCallback } from 'react';
import { toast } from "@/hooks/use-toast";
import { useRAGServices } from "@/hooks/useRAGServices";
import { AgentSource } from "@/types/rag";

export const useWebsiteSourcesOperations = () => {
  const { sources: sourceService } = useRAGServices();

  const handleAddWebsite = useCallback(async (url: string, options: any) => {
    try {
      console.log('Adding website:', url, options);
      // This will be handled by the EnhancedWebsiteCrawlFormV3 component
      toast({
        title: "Website Added",
        description: "Website crawling has been initiated.",
      });
    } catch (error) {
      console.error('Failed to add website:', error);
      toast({
        title: "Error",
        description: "Failed to add website. Please try again.",
        variant: "destructive"
      });
    }
  }, []);

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
      await sourceService.deleteSource(source.id);
      
      toast({
        title: "Success",
        description: "Source deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    }
  }, [sourceService]);

  const handleRecrawl = useCallback(async (source: AgentSource) => {
    try {
      await sourceService.updateSource(source.id, {
        crawl_status: 'pending',
        progress: 0,
        links_count: 0,
        last_crawled_at: new Date().toISOString(),
        metadata: {
          ...source.metadata,
          last_progress_update: new Date().toISOString(),
          restart_count: (source.metadata?.restart_count || 0) + 1
        }
      });
      
      toast({
        title: "Recrawl initiated",
        description: "The website will be recrawled shortly"
      });
    } catch (error) {
      console.error('Recrawl error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate recrawl",
        variant: "destructive"
      });
    }
  }, [sourceService]);

  return {
    handleAddWebsite,
    handleEdit,
    handleExclude,
    handleDelete,
    handleRecrawl,
    loading: false,
    error: null
  };
};
