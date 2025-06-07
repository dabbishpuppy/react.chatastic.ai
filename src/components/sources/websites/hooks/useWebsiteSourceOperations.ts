
import { useCallback } from 'react';
import { AgentSource } from '@/types/rag';
import { useWorkflowCrawlIntegration } from '@/hooks/useWorkflowCrawlIntegration';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useWebsiteSourceOperations = (
  onRefetch: () => void,
  onRemoveFromState: (sourceId: string) => void
) => {
  const { initiateWebsiteCrawl, markSourceForRemoval } = useWorkflowCrawlIntegration();
  const { toast } = useToast();

  const handleEdit = useCallback(async (sourceId: string, newUrl: string) => {
    try {
      const { error } = await supabase
        .from('agent_sources')
        .update({ url: newUrl })
        .eq('id', sourceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Source URL updated successfully"
      });

      onRefetch();
    } catch (error) {
      console.error('Error updating source:', error);
      toast({
        title: "Error",
        description: "Failed to update source URL",
        variant: "destructive"
      });
    }
  }, [onRefetch, toast]);

  const handleExclude = useCallback(async (source: AgentSource) => {
    try {
      const { error } = await supabase
        .from('agent_sources')
        .update({ is_excluded: !source.is_excluded })
        .eq('id', source.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Source ${source.is_excluded ? 'included' : 'excluded'} successfully`
      });

      onRefetch();
    } catch (error) {
      console.error('Error updating source exclusion:', error);
      toast({
        title: "Error",
        description: "Failed to update source exclusion",
        variant: "destructive"
      });
    }
  }, [onRefetch, toast]);

  const handleRecrawl = useCallback(async (source: AgentSource) => {
    if (!source.url) return;

    try {
      await initiateWebsiteCrawl(source.agent_id, source.id, source.url, {
        crawlMode: 'full-website',
        maxPages: 100,
        maxDepth: 3,
        respectRobots: true
      });

      toast({
        title: "Success",
        description: "Recrawl started successfully"
      });

      onRefetch();
    } catch (error) {
      console.error('Error starting recrawl:', error);
      toast({
        title: "Error",
        description: "Failed to start recrawl",
        variant: "destructive"
      });
    }
  }, [initiateWebsiteCrawl, onRefetch, toast]);

  const handleDelete = useCallback(async (source: AgentSource) => {
    try {
      await markSourceForRemoval(source);
      onRemoveFromState(source.id);
      onRefetch();
    } catch (error) {
      console.error('Error deleting source:', error);
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    }
  }, [markSourceForRemoval, onRemoveFromState, onRefetch, toast]);

  return {
    handleEdit,
    handleExclude,
    handleRecrawl,
    handleDelete
  };
};
