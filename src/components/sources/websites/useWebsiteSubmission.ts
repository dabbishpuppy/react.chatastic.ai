
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { AgentSource } from '@/types/rag';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface WebsiteSubmissionData {
  url: string;
  includePaths?: string[];
  excludePaths?: string[];
  crawlType: 'crawl-links' | 'sitemap' | 'individual-link';
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
}

export const useWebsiteSubmission = () => {
  const { agentId } = useParams();
  const { sources } = useRAGServices();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitWebsiteSource = async (data: WebsiteSubmissionData): Promise<AgentSource | null> => {
    if (!agentId) {
      console.error('❌ No agent ID found');
      toast({
        title: "Error",
        description: "No agent ID found",
        variant: "destructive"
      });
      return null;
    }

    const submissionStartTime = new Date().toISOString();
    console.log('🚀 Starting website source submission:', {
      agentId,
      url: data.url,
      crawlType: data.crawlType,
      timestamp: submissionStartTime
    });

    setIsSubmitting(true);
    try {
      // Get team_id from agent
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found');
      }

      // Create the source with immediate 'pending' status
      const sourceData = {
        agent_id: agentId,
        team_id: agent.team_id,
        source_type: 'website' as const,
        title: data.url,
        url: data.url,
        crawl_status: 'pending', // Immediate pending status
        progress: 0,
        links_count: 0,
        is_active: true, // Ensure it appears in the list immediately
        metadata: {
          crawlType: data.crawlType,
          includePaths: data.includePaths || [],
          excludePaths: data.excludePaths || [],
          maxPages: data.maxPages || 100,
          maxDepth: data.maxDepth || 3,
          concurrency: data.concurrency || 2,
          last_progress_update: submissionStartTime,
          submission_time: submissionStartTime
        }
      };

      console.log('📝 Creating source with data:', sourceData);

      const result = await sources.createSource(sourceData);

      console.log('✅ Source created successfully:', {
        sourceId: result.id,
        status: result.crawl_status,
        timestamp: new Date().toISOString()
      });

      // Now trigger the actual crawl via edge function
      try {
        console.log('🔄 Initiating crawl via edge function:', {
          sourceId: result.id,
          url: data.url,
          crawlType: data.crawlType
        });

        const { data: crawlResult, error: crawlError } = await supabase.functions.invoke('crawl-website', {
          body: {
            source_id: result.id,
            url: data.url,
            crawl_type: data.crawlType,
            max_pages: data.maxPages,
            max_depth: data.maxDepth,
            concurrency: data.concurrency,
            include_paths: data.includePaths,
            exclude_paths: data.excludePaths,
            enable_content_pipeline: true
          }
        });

        if (crawlError) {
          console.error('❌ Crawl initiation failed:', crawlError);
          
          // Update the source status to failed
          await sources.updateSource(result.id, { 
            crawl_status: 'failed',
            metadata: {
              ...result.metadata,
              error_message: crawlError.message || 'Failed to start crawl',
              last_error_at: new Date().toISOString()
            }
          });
          
          toast({
            title: "Warning",
            description: "Source created but crawl failed to start. You can try to recrawl it later.",
            variant: "destructive"
          });
        } else {
          console.log('✅ Crawl initiated successfully:', crawlResult);
          
          toast({
            title: "Success",
            description: "Website source created and crawl started",
          });
        }
      } catch (crawlError) {
        console.error('❌ Error initiating crawl:', crawlError);
        
        // Update the source status to failed but don't prevent the UI from showing it
        await sources.updateSource(result.id, { 
          crawl_status: 'failed',
          metadata: {
            ...result.metadata,
            error_message: crawlError instanceof Error ? crawlError.message : 'Unknown crawl error',
            last_error_at: new Date().toISOString()
          }
        });
        
        toast({
          title: "Warning", 
          description: "Source created but crawl failed to start. You can try to recrawl it later.",
          variant: "destructive"
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error creating website source:', error);
      toast({
        title: "Error",
        description: "Failed to create website source",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Website submission process completed:', {
        timestamp: new Date().toISOString(),
        duration: Date.now() - new Date(submissionStartTime).getTime()
      });
    }
  };

  const refetch = async () => {
    // This will be used by components that need to refresh data
    console.log('🔄 Refetch requested for website sources');
  };

  return {
    isSubmitting,
    submitWebsiteSource,
    refetch
  };
};
