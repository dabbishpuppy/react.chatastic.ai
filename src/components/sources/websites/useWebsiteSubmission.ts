
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { supabase } from '@/integrations/supabase/client';

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

      // Trigger the crawling process via edge function
      try {
        console.log('🚀 Triggering crawl for source:', newSource.id);
        
        const { data: crawlResponse, error: crawlError } = await supabase.functions.invoke('crawl-website', {
          body: {
            source_id: newSource.id,
            url: url,
            crawl_type: formData.crawlType
          }
        });

        if (crawlError) {
          console.error('❌ Crawl trigger error:', crawlError);
          // Update source status to failed
          await sources.updateSource(newSource.id, {
            crawl_status: 'failed',
            metadata: {
              ...metadata,
              error: `Failed to start crawl: ${crawlError.message}`,
              failedAt: new Date().toISOString()
            }
          });
        } else {
          console.log('✅ Crawl triggered successfully:', crawlResponse);
        }
      } catch (crawlTriggerError) {
        console.error('❌ Failed to trigger crawl:', crawlTriggerError);
        // Update source status to failed
        await sources.updateSource(newSource.id, {
          crawl_status: 'failed',
          metadata: {
            ...metadata,
            error: `Failed to start crawl: ${crawlTriggerError instanceof Error ? crawlTriggerError.message : 'Unknown error'}`,
            failedAt: new Date().toISOString()
          }
        });
      }

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
