
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';
import { AgentSource } from '@/types/rag';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';

interface OptimisticCrawlData {
  url: string;
  crawlMode: 'single-page' | 'sitemap-only' | 'full-website';
  maxPages: number;
  maxDepth: number;
  respectRobots: boolean;
  includePaths: string[];
  excludePaths: string[];
}

interface OptimisticSource extends Omit<AgentSource, 'id' | 'created_at' | 'updated_at'> {
  id: string;
  created_at: string;
  updated_at: string;
  isOptimistic?: boolean;
  clientId?: string;
}

export const useOptimisticWebsiteCrawl = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  const { initiateCrawl } = useEnhancedCrawl();

  const mutation = useMutation({
    mutationFn: async (data: OptimisticCrawlData & { clientId: string }) => {
      console.log('🚀 Starting crawl with clientId:', data.clientId);
      
      // Call the actual crawl initiation
      const result = await initiateCrawl({
        url: data.url,
        agentId: agentId!,
        crawlMode: data.crawlMode,
        maxPages: data.maxPages,
        maxDepth: data.maxDepth,
        respectRobots: data.respectRobots,
        includePaths: data.includePaths,
        excludePaths: data.excludePaths
      });

      // Return both the result and clientId for reconciliation
      return {
        ...result,
        clientId: data.clientId
      };
    },

    onMutate: async (variables) => {
      const { clientId, url } = variables;
      
      console.log('⚡ Optimistic update: Adding source immediately with clientId:', clientId);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['sources-paginated', agentId, 'website']
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['sources-paginated', agentId, 'website', 1, 25]);

      // Create optimistic source
      const optimisticSource: OptimisticSource = {
        id: clientId,
        agent_id: agentId!,
        title: url,
        url: url,
        source_type: 'website',
        crawl_status: 'submitting',
        progress: 0,
        is_active: true,
        requires_manual_training: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isOptimistic: true,
        clientId: clientId,
        metadata: {
          optimistic: true,
          submitting: true
        }
      };

      // Optimistically update the cache
      queryClient.setQueryData(['sources-paginated', agentId, 'website', 1, 25], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          sources: [optimisticSource, ...old.sources],
          totalCount: old.totalCount + 1
        };
      });

      console.log('✅ Optimistic source added to cache');

      // Return context for rollback
      return { previousData, clientId };
    },

    onSuccess: (result, variables, context) => {
      const { parentSourceId } = result;
      const { clientId } = context || {};

      console.log('🎉 Crawl initiated successfully, reconciling optimistic update:', {
        clientId,
        realSourceId: parentSourceId
      });

      // Replace optimistic entry with real data
      queryClient.setQueryData(['sources-paginated', agentId, 'website', 1, 25], (old: any) => {
        if (!old) return old;

        const updatedSources = old.sources.map((source: OptimisticSource) => {
          if (source.clientId === clientId) {
            // Replace optimistic source with real data
            return {
              ...source,
              id: parentSourceId,
              crawl_status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              isOptimistic: false,
              metadata: {
                ...source.metadata,
                optimistic: false,
                submitting: false
              }
            };
          }
          return source;
        });

        return {
          ...old,
          sources: updatedSources
        };
      });

      toast({
        title: "Crawl Started",
        description: `Website crawling initiated for ${variables.url}`
      });

      console.log('✅ Optimistic update reconciled with real data');
    },

    onError: (error, variables, context) => {
      console.error('❌ Crawl failed, rolling back optimistic update:', error);

      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(['sources-paginated', agentId, 'website', 1, 25], context.previousData);
      } else {
        // Fallback: remove the optimistic entry
        queryClient.setQueryData(['sources-paginated', agentId, 'website', 1, 25], (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            sources: old.sources.filter((source: OptimisticSource) => source.clientId !== context?.clientId),
            totalCount: Math.max(0, old.totalCount - 1)
          };
        });
      }

      toast({
        title: "Crawl Failed",
        description: error instanceof Error ? error.message : "Failed to start website crawl",
        variant: "destructive"
      });
    }
  });

  const submitWebsite = async (data: OptimisticCrawlData) => {
    if (!agentId) return;

    // Generate client ID for optimistic update
    const clientId = uuidv4();
    
    console.log('🎯 Starting optimistic crawl submission with clientId:', clientId);

    // Trigger the mutation with optimistic updates
    return mutation.mutateAsync({
      ...data,
      clientId
    });
  };

  return {
    submitWebsite,
    isSubmitting: mutation.isPending,
    error: mutation.error
  };
};
