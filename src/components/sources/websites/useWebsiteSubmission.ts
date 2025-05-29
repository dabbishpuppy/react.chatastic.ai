
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { WebsiteCrawlService } from '@/services/rag/websiteCrawlService';

interface WebsiteSubmissionData {
  url: string;
  includePaths?: string;
  excludePaths?: string;
  crawlType: 'crawl-links' | 'sitemap' | 'individual-link';
}

export const useWebsiteSubmission = (onSuccess?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { agentId } = useParams();
  const { sources: sourceService } = useRAGServices();

  const submitWebsiteSource = async (data: WebsiteSubmissionData) => {
    if (!agentId) return null;

    setIsSubmitting(true);
    
    try {
      // Create the parent source with just the URL as title
      const source = await sourceService.createSource({
        agent_id: agentId,
        source_type: 'website',
        title: data.url,
        url: data.url,
        crawl_status: 'pending',
        progress: 0,
        links_count: 0,
        metadata: {
          crawl_type: data.crawlType,
          include_paths: data.includePaths,
          exclude_paths: data.excludePaths,
          created_at: new Date().toISOString()
        }
      });

      // Start enhanced crawling based on type
      if (data.crawlType === 'crawl-links') {
        // Start background crawling with recursive capability
        WebsiteCrawlService.startEnhancedCrawl(
          agentId,
          source.id,
          data.url,
          {
            maxDepth: 3,
            maxPages: Infinity, // Infinite crawling
            includePaths: data.includePaths,
            excludePaths: data.excludePaths,
            respectRobots: true
          }
        ).catch(error => {
          console.error('Background crawl failed:', error);
          toast({
            title: "Crawling error",
            description: "An error occurred during crawling, but it will continue in the background",
            variant: "destructive"
          });
        });

        toast({
          title: "Crawling started",
          description: "Website crawling has started and will continue in the background",
        });
      } else if (data.crawlType === 'individual-link') {
        // For individual links, just crawl the single page
        WebsiteCrawlService.startEnhancedCrawl(
          agentId,
          source.id,
          data.url,
          {
            maxDepth: 0, // Only crawl the single page
            maxPages: 1
          }
        ).catch(error => {
          console.error('Single page crawl failed:', error);
        });

        toast({
          title: "Link added",
          description: "Individual link is being processed",
        });
      } else if (data.crawlType === 'sitemap') {
        // For sitemap crawling
        WebsiteCrawlService.startEnhancedCrawl(
          agentId,
          source.id,
          data.url,
          {
            maxDepth: 0,
            maxPages: Infinity
          }
        ).catch(error => {
          console.error('Sitemap crawl failed:', error);
        });

        toast({
          title: "Sitemap crawling started",
          description: "Sitemap is being processed in the background",
        });
      }

      if (onSuccess) {
        onSuccess();
      }

      return source;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start website crawling",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitWebsiteSource
  };
};
