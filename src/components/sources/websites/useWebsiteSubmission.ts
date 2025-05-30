
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
      const result = await sources.createSource({
        agent_id: agentId,
        source_type: 'website',
        title: data.url,
        url: data.url,
        metadata: {
          crawlType: data.crawlType,
          includePaths: data.includePaths || [],
          excludePaths: data.excludePaths || [],
          maxPages: data.maxPages,
          maxDepth: data.maxDepth,
          concurrency: data.concurrency
        }
      });

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
