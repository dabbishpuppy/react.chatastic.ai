
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { AgentSource } from '@/types/rag';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { WebsiteCrawlService } from '@/services/rag/websiteCrawlService';

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
    console.log('🚀 Starting website source submission with advanced compression:', {
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
        crawl_status: 'pending',
        progress: 0,
        links_count: 0,
        is_active: true,
        metadata: {
          crawlType: data.crawlType,
          includePaths: data.includePaths || [],
          excludePaths: data.excludePaths || [],
          maxPages: data.maxPages || 100,
          maxDepth: data.maxDepth || 3,
          concurrency: data.concurrency || 2,
          last_progress_update: submissionStartTime,
          submission_time: submissionStartTime,
          advanced_compression_enabled: true, // Mark for advanced compression
          content_pipeline_enabled: true
        }
      };

      console.log('📝 Creating source with advanced compression data:', sourceData);

      const result = await sources.createSource(sourceData);

      console.log('✅ Source created successfully:', {
        sourceId: result.id,
        status: result.crawl_status,
        timestamp: new Date().toISOString()
      });

      // Now trigger the enhanced crawl with advanced compression
      try {
        console.log('🔄 Initiating enhanced crawl with advanced compression:', {
          sourceId: result.id,
          url: data.url,
          crawlType: data.crawlType
        });

        // Use the enhanced crawl service instead of the standard one
        await WebsiteCrawlService.startEnhancedCrawl(
          agentId,
          result.id,
          data.url,
          {
            maxPages: data.maxPages || 100,
            maxDepth: data.maxDepth || 3,
            concurrency: data.concurrency || 2,
            includePaths: data.includePaths?.join(','),
            excludePaths: data.excludePaths?.join(','),
            enableAdvancedCompression: true // Enable advanced compression
          }
        );

        console.log('✅ Enhanced crawl with advanced compression initiated successfully');
        
        toast({
          title: "Success",
          description: "Website source created with advanced compression enabled",
        });

      } catch (crawlError) {
        console.error('❌ Error initiating enhanced crawl:', crawlError);
        
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
          description: "Source created but enhanced crawl failed to start. You can try to recrawl it later.",
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
    console.log('🔄 Refetch requested for website sources');
  };

  return {
    isSubmitting,
    submitWebsiteSource,
    refetch
  };
};
