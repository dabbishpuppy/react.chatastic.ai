
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';

export interface WebsiteFormData {
  url: string;
  includePaths?: string;
  excludePaths?: string;
  crawlType: 'crawl-links' | 'sitemap' | 'individual-link';
}

export const useWebsiteSubmission = (refetch: () => void) => {
  const { agentId } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sources } = useRAGServices();

  const submitWebsiteSource = async (formData: WebsiteFormData) => {
    if (!agentId) {
      toast({
        title: "Error",
        description: "Agent ID is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.url) {
      toast({
        title: "URL required",
        description: "Please enter a URL",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Ensure URL starts with http:// or https://
      let url = formData.url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // Prepare metadata based on crawl type
      const metadata = {
        crawlType: formData.crawlType,
        includePaths: formData.includePaths?.split(',').map(p => p.trim()).filter(Boolean) || [],
        excludePaths: formData.excludePaths?.split(',').map(p => p.trim()).filter(Boolean) || [],
        submittedAt: new Date().toISOString()
      };

      // Determine title based on crawl type
      let title = url;
      if (formData.crawlType === 'crawl-links') {
        title = `Crawl: ${url}`;
      } else if (formData.crawlType === 'sitemap') {
        title = `Sitemap: ${url}`;
      }

      const newSource = await sources.createSource({
        agent_id: agentId,
        source_type: 'website',
        title,
        url,
        metadata,
        crawl_status: 'pending',
        progress: 0,
        links_count: 0
      });

      console.log('✅ New website source created:', newSource);

      toast({
        title: "Website source added",
        description: `${title} has been added and will be processed shortly`
      });

      // Trigger refetch to update the UI
      setTimeout(() => {
        refetch();
      }, 500);

      return newSource;

    } catch (error) {
      console.error('Error creating website source:', error);
      toast({
        title: "Failed to add website source",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitWebsiteSource
  };
};
