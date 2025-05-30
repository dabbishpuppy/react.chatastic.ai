
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { AgentSource } from '@/types/rag';
import { useParams } from 'react-router-dom';

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
      toast({
        title: "Error",
        description: "No agent ID found",
        variant: "destructive"
      });
      return null;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting website source with data:', data);
      
      const result = await sources.createSource({
        agent_id: agentId,
        source_type: 'website',
        title: data.url,
        url: data.url,
        crawl_status: 'pending',
        metadata: {
          crawlType: data.crawlType,
          includePaths: data.includePaths || [],
          excludePaths: data.excludePaths || [],
          maxPages: data.maxPages || 100,
          maxDepth: data.maxDepth || 3,
          concurrency: data.concurrency || 2,
          last_progress_update: new Date().toISOString()
        }
      });

      console.log('Source created:', result);

      // Trigger the actual crawl via edge function
      try {
        const { data: crawlResult, error: crawlError } = await fetch('/functions/v1/crawl-website', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            source_id: result.id,
            url: data.url,
            crawl_type: data.crawlType,
            max_pages: data.maxPages,
            max_depth: data.maxDepth,
            concurrency: data.concurrency,
            include_paths: data.includePaths,
            exclude_paths: data.excludePaths,
            enable_content_pipeline: true
          })
        }).then(res => res.json());

        if (crawlError) {
          console.error('Crawl initiation failed:', crawlError);
          await sources.updateSource(result.id, { crawl_status: 'failed' });
          throw new Error(crawlError.message || 'Failed to start crawl');
        }

        console.log('Crawl initiated successfully:', crawlResult);
      } catch (crawlError) {
        console.error('Error initiating crawl:', crawlError);
        // Update the source status to failed but don't prevent the UI from showing it
        await sources.updateSource(result.id, { crawl_status: 'failed' });
      }

      toast({
        title: "Success",
        description: "Website source submitted for crawling",
      });

      return result;
    } catch (error) {
      console.error('Error submitting website source:', error);
      toast({
        title: "Error",
        description: "Failed to submit website source",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const refetch = async () => {
    // This will be used by components that need to refresh data
    // The actual refetching is handled by the components using useSourcesPaginated
  };

  return {
    isSubmitting,
    submitWebsiteSource,
    refetch
  };
};
