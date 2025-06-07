
import { useCallback, useRef } from 'react';
import { toast } from "@/hooks/use-toast";
import { useRAGServices } from "@/hooks/useRAGServices";
import { AgentSource } from "@/types/rag";
import { MissingChunksService } from "@/services/rag/embedding/missingChunksService";

export const useWebsiteSourceOperations = (refetch: () => void, removeSourceFromState: (sourceId: string) => void) => {
  const { sources: sourceService } = useRAGServices();
  const recrawlInProgressRef = useRef<Set<string>>(new Set());

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
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update URL",
        variant: "destructive"
      });
    }
  }, [sourceService, refetch]);

  const handleExclude = useCallback(async (source: AgentSource) => {
    try {
      await sourceService.updateSource(source.id, {
        is_excluded: !source.is_excluded
      });
      
      toast({
        title: "Success",
        description: `Link ${source.is_excluded ? 'included' : 'excluded'} successfully`
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update link status",
        variant: "destructive"
      });
    }
  }, [sourceService, refetch]);

  const handleDelete = useCallback(async (source: AgentSource) => {
    try {
      // Show initial deletion toast
      toast({
        title: "Deleting source...",
        description: "Removing source and all related data"
      });

      await sourceService.deleteSource(source.id);
      removeSourceFromState(source.id);
      
      toast({
        title: "Success",
        description: "Source and all related data deleted successfully"
      });
      
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    }
  }, [sourceService, removeSourceFromState, refetch]);

  const handleRecrawl = useCallback(async (source: AgentSource) => {
    if (recrawlInProgressRef.current.has(source.id)) {
      console.log(`Recrawl already in progress for source ${source.id}`);
      return;
    }

    try {
      recrawlInProgressRef.current.add(source.id);

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
        description: "The website will be recrawled and embeddings will be generated automatically"
      });
      
      refetch();
    } catch (error) {
      console.error('Recrawl error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate recrawl",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        recrawlInProgressRef.current.delete(source.id);
      }, 2000);
    }
  }, [sourceService, refetch]);

  const handleEnhancedRecrawl = useCallback(async (source: AgentSource) => {
    if (recrawlInProgressRef.current.has(source.id)) {
      console.log(`Enhanced recrawl already in progress for source ${source.id}`);
      return;
    }

    try {
      recrawlInProgressRef.current.add(source.id);

      toast({
        title: "Enhanced Recrawl Initiated",
        description: "Re-crawling with improved content extraction for better accuracy"
      });

      // First, delete existing chunks for this source to avoid duplicates
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { error: deleteError } = await supabase
        .from('source_chunks')
        .delete()
        .eq('source_id', source.id);

      if (deleteError) {
        console.error('Error deleting existing chunks:', deleteError);
      }

      // Update source status and trigger enhanced recrawl
      await sourceService.updateSource(source.id, {
        crawl_status: 'pending',
        progress: 0,
        links_count: 0,
        last_crawled_at: new Date().toISOString(),
        metadata: {
          ...source.metadata,
          last_progress_update: new Date().toISOString(),
          restart_count: (source.metadata?.restart_count || 0) + 1,
          enhanced_extraction: true,
          recrawl_reason: 'enhanced_content_extraction'
        }
      });

      // Trigger enhanced crawl
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          agentId: source.agent_id,
          url: source.url,
          crawlMode: 'single-page',
          maxPages: 1,
          enableCompression: true,
          enableDeduplication: true,
          priority: 'high'
        }
      });

      if (error) {
        throw new Error(`Enhanced crawl failed: ${error.message}`);
      }

      toast({
        title: "Enhanced Recrawl Started",
        description: "Page will be processed with improved content extraction"
      });
      
      refetch();
    } catch (error) {
      console.error('Enhanced recrawl error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate enhanced recrawl",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        recrawlInProgressRef.current.delete(source.id);
      }, 2000);
    }
  }, [sourceService, refetch]);

  const handleGenerateMissingEmbeddings = useCallback(async () => {
    try {
      toast({
        title: "Generating Missing Embeddings",
        description: "Processing chunks without embeddings..."
      });

      const result = await MissingChunksService.generateMissingChunks();
      
      if (result.success) {
        toast({
          title: "Embeddings Generated",
          description: `Generated ${result.chunksCreated} chunks and ${result.embeddingsGenerated} embeddings. AI can now access this content.`
        });
        
        refetch();
      }
    } catch (error) {
      console.error('Generate embeddings error:', error);
      toast({
        title: "Error",
        description: "Failed to generate missing embeddings",
        variant: "destructive"
      });
    }
  }, [refetch]);

  return {
    handleEdit,
    handleExclude,
    handleDelete,
    handleRecrawl,
    handleEnhancedRecrawl,
    handleGenerateMissingEmbeddings
  };
};
