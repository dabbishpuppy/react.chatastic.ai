
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WebsiteSubmissionData {
  url: string;
  respectRobots: boolean;
  excludePaths: string[];
  includePaths: string[];
  maxConcurrentJobs: number;
}

export const useWebsiteSubmissionV2 = () => {
  const { agentId } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitWebsite = async (data: WebsiteSubmissionData) => {
    if (!agentId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      console.log('🚀 Starting crawl-only submission:', data.url);

      // Get agent info to determine team_id
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', agentId)
        .single();

      if (agentError) {
        throw new Error(`Failed to get agent info: ${agentError.message}`);
      }

      // Create the parent source in pending status
      const { data: source, error: sourceError } = await supabase
        .from('agent_sources')
        .insert({
          agent_id: agentId,
          team_id: agent.team_id,
          source_type: 'website',
          title: data.url,
          url: data.url,
          crawl_status: 'pending',
          workflow_status: 'CREATED',
          exclude_paths: data.excludePaths,
          include_paths: data.includePaths,
          respect_robots: data.respectRobots,
          max_concurrent_jobs: data.maxConcurrentJobs,
          metadata: {
            submission_timestamp: new Date().toISOString(),
            phase: 'crawl_only',
            requires_manual_training: true
          }
        })
        .select()
        .single();

      if (sourceError) {
        throw new Error(`Failed to create source: ${sourceError.message}`);
      }

      console.log('✅ Parent source created:', source.id);

      // Start the enhanced crawl process (crawl only, no chunking)
      const { data: crawlResult, error: crawlError } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          url: data.url,
          agentId,
          parentSourceId: source.id,
          teamId: agent.team_id,
          customerId: agent.team_id,
          crawlMode: 'full-website',
          maxPages: 10000,
          maxDepth: 10,
          respectRobots: data.respectRobots,
          includePaths: data.includePaths,
          excludePaths: data.excludePaths
        }
      });

      if (crawlError) {
        console.error('❌ Crawl failed:', crawlError);
        
        // Update source status to failed
        await supabase
          .from('agent_sources')
          .update({
            crawl_status: 'failed',
            workflow_status: 'ERROR',
            metadata: {
              ...source.metadata,
              error: crawlError.message,
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', source.id);

        throw new Error(`Crawl failed: ${crawlError.message}`);
      }

      console.log('✅ Crawl initiated successfully:', crawlResult);

      toast({
        title: "Crawl Started",
        description: `Website crawling has been initiated for ${data.url}. You can retrain the agent once crawling is complete.`,
      });

      // Emit source creation event for real-time UI update
      window.dispatchEvent(new CustomEvent('sourceCreated', {
        detail: { 
          sourceId: source.id, 
          agentId,
          sourceType: 'website',
          source: source
        }
      }));

      return source;

    } catch (error) {
      console.error('❌ Website submission failed:', error);
      toast({
        title: "Crawl Failed",
        description: error instanceof Error ? error.message : "Failed to start crawl",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitWebsite,
    isSubmitting
  };
};
