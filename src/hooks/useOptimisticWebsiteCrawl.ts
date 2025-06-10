
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
        queryKey: ['agent-sources-paginated', agentId, 'website']
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['agent-sources-paginated', agentId, 'website', 1, 25]);

      // Create optimistic source with a temporary real-looking ID
      const tempId = uuidv4();
      const optimisticSource: OptimisticSource = {
        id: tempId,
        agent_id: agentId!,
        team_id: 'temp-team-id',
        title: url,
        url: url,
        source_type: 'website',
        crawl_status: 'pending',
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

      // Optimistically update both paginated sources and stats
      queryClient.setQueryData(['agent-sources-paginated', agentId, 'website', 1, 25], (old: any) => {
        if (!old) {
          return {
            sources: [optimisticSource],
            totalCount: 1,
            totalPages: 1,
            currentPage: 1
          };
        }
        
        return {
          ...old,
          sources: [optimisticSource, ...old.sources],
          totalCount: old.totalCount + 1
        };
      });

      // Also update stats immediately
      queryClient.setQueryData(['agent-source-stats', agentId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          totalSources: old.totalSources + 1,
          sourcesByType: {
            ...old.sourcesByType,
            website: {
              count: (old.sourcesByType.website?.count || 0) + 1,
              size: old.sourcesByType.website?.size || 0
            }
          }
        };
      });

      console.log('✅ Optimistic source added to cache with temp ID:', tempId);

      return { previousData, clientId, tempId };
    },

    onSuccess: (result, variables, context) => {
      const { parentSourceId } = result;
      const { clientId, tempId } = context || {};

      console.log('🎉 Crawl initiated successfully, keeping optimistic source:', {
        clientId,
        tempId,
        realSourceId: parentSourceId
      });

      // Don't remove the optimistic source - let the real-time subscription handle updates
      // Just update the source to mark it as no longer optimistic
      queryClient.setQueryData(['agent-sources-paginated', agentId, 'website', 1, 25], (old: any) => {
        if (!old) return old;

        const updatedSources = old.sources.map((source: OptimisticSource) => {
          if (source.clientId === clientId || source.id === tempId) {
            return {
              ...source,
              id: parentSourceId || source.id,
              crawl_status: 'pending',
              isOptimistic: false,
              metadata: {
                ...source.metadata,
                optimistic: false,
                submitting: false,
                realSourceId: parentSourceId
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

      // Trigger a refetch after a short delay to get the real data
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['agent-sources-paginated', agentId, 'website']
        });
        queryClient.invalidateQueries({
          queryKey: ['agent-source-stats', agentId]
        });
      }, 2000);

      toast({
        title: "Crawl Started",
        description: `Website crawling initiated for ${variables.url}`
      });

      console.log('✅ Optimistic update maintained, real-time will handle updates');
    },

    onError: (error, variables, context) => {
      console.error('❌ Crawl failed, rolling back optimistic update:', error);

      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(['agent-sources-paginated', agentId, 'website', 1, 25], context.previousData);
      }

      // Also rollback stats
      queryClient.setQueryData(['agent-source-stats', agentId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          totalSources: Math.max(0, old.totalSources - 1),
          sourcesByType: {
            ...old.sourcesByType,
            website: {
              count: Math.max(0, (old.sourcesByType.website?.count || 0) - 1),
              size: old.sourcesByType.website?.size || 0
            }
          }
        };
      });

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
