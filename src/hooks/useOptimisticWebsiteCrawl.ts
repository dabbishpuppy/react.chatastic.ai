
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';
import { AgentSource } from '@/types/rag';
import { supabase } from '@/integrations/supabase/client';
import { CrawlOrchestrator } from '@/services/crawl/distributed/CrawlOrchestrator';

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

  const mutation = useMutation({
    mutationFn: async (data: OptimisticCrawlData & { clientId: string }) => {
      console.log('🚀 Starting crawl with clientId:', data.clientId);
      
      // First, create the actual agent source in the database
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', agentId!)
        .single();

      if (agentError || !agentData) {
        throw new Error('Failed to get agent data: ' + agentError?.message);
      }

      // Create the real source in the database first
      const { data: sourceData, error: sourceError } = await supabase
        .from('agent_sources')
        .insert({
          agent_id: agentId!,
          team_id: agentData.team_id,
          url: data.url,
          title: data.url,
          source_type: 'website',
          crawl_status: 'pending',
          is_active: true,
          metadata: {
            crawlMode: data.crawlMode,
            maxPages: data.maxPages,
            maxDepth: data.maxDepth,
            respectRobots: data.respectRobots,
            includePaths: data.includePaths,
            excludePaths: data.excludePaths,
            clientId: data.clientId,
            optimistic: false
          }
        })
        .select()
        .single();

      if (sourceError || !sourceData) {
        throw new Error('Failed to create source: ' + sourceError?.message);
      }

      console.log('✅ Real source created in database:', sourceData.id);

      // Now start the distributed crawl with the real source ID
      try {
        const sessionId = await CrawlOrchestrator.initiateCrawl({
          parentSourceId: sourceData.id,
          agentId: agentId!,
          url: data.url,
          crawlConfig: {
            maxPages: data.maxPages,
            maxDepth: data.maxDepth,
            excludePaths: data.excludePaths,
            includePaths: data.includePaths,
            respectRobots: data.respectRobots
          },
          priority: 'normal' as 'low' | 'normal' | 'high'
        });

        return {
          parentSourceId: sourceData.id,
          sessionId,
          realSource: sourceData,
          clientId: data.clientId
        };
      } catch (crawlError) {
        console.error('❌ Crawl initiation failed, cleaning up source:', crawlError);
        
        // Clean up the source if crawl initiation fails
        await supabase
          .from('agent_sources')
          .delete()
          .eq('id', sourceData.id);
        
        throw crawlError;
      }
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

      // Create optimistic source with a temporary ID that won't conflict
      const tempId = `temp-${clientId}`;
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
          submitting: true,
          message: 'Creating source...'
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
          sources: [optimisticSource, ...(old.sources || [])],
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
      if (!result || !context) return;
      
      const { parentSourceId, realSource } = result;
      const { clientId, tempId } = context;

      console.log('🎉 Crawl initiated successfully with real source:', {
        clientId,
        tempId,
        realSourceId: parentSourceId
      });

      // Replace the optimistic source with the real one
      queryClient.setQueryData(['agent-sources-paginated', agentId, 'website', 1, 25], (old: any) => {
        if (!old || !Array.isArray(old.sources)) return old;

        const updatedSources = old.sources.map((source: OptimisticSource) => {
          if (source.clientId === clientId || source.id === tempId) {
            return {
              ...realSource,
              isOptimistic: false,
              metadata: {
                ...realSource.metadata,
                optimistic: false,
                submitting: false,
                message: 'Crawl initiated successfully'
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

      // Update stats to reflect real data
      queryClient.invalidateQueries({
        queryKey: ['agent-source-stats', agentId]
      });

      toast({
        title: "Crawl Started",
        description: `Website crawling initiated for ${variables.url}`
      });

      console.log('✅ Source successfully created and crawl initiated');
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
