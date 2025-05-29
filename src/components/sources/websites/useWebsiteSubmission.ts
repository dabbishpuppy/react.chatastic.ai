
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
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
}

// Helper function to normalize URL
const normalizeUrl = (url: string): string => {
  // Remove any whitespace
  url = url.trim();
  
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch {
    // If still invalid, try with http://
    try {
      const httpUrl = url.startsWith('http') ? url : 'http://' + url;
      return new URL(httpUrl).toString();
    } catch {
      return url;
    }
  }
};

// Helper function to get domain from URL for display
const getDomainFromUrl = (url: string): string => {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const useWebsiteSubmission = (onSuccess?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { agentId } = useParams();
  const { sources: sourceService } = useRAGServices();

  const submitWebsiteSource = async (data: WebsiteSubmissionData) => {
    if (!agentId) return null;

    setIsSubmitting(true);
    
    try {
      // Normalize the URL first
      const normalizedUrl = normalizeUrl(data.url);
      const domain = getDomainFromUrl(normalizedUrl);
      
      console.log('📝 Submitting website source:', {
        originalUrl: data.url,
        normalizedUrl,
        domain,
        crawlType: data.crawlType,
        maxPages: data.maxPages,
        maxDepth: data.maxDepth,
        concurrency: data.concurrency
      });

      // Create the parent source with the domain as title and normalized URL
      const source = await sourceService.createSource({
        agent_id: agentId,
        source_type: 'website',
        title: domain,
        url: normalizedUrl,
        crawl_status: 'pending',
        progress: 0,
        links_count: 0,
        metadata: {
          crawl_type: data.crawlType,
          include_paths: data.includePaths,
          exclude_paths: data.excludePaths,
          max_pages: data.maxPages,
          max_depth: data.maxDepth,
          concurrency: data.concurrency,
          created_at: new Date().toISOString()
        }
      });

      // Start enhanced crawling based on type
      if (data.crawlType === 'crawl-links') {
        // Start background crawling with configurable settings
        WebsiteCrawlService.startEnhancedCrawl(
          agentId,
          source.id,
          normalizedUrl,
          {
            maxDepth: data.maxDepth || 10,
            maxPages: data.maxPages || 1000,
            includePaths: data.includePaths,
            excludePaths: data.excludePaths,
            respectRobots: true,
            concurrency: data.concurrency || 5
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
          description: `Website crawling started with max ${data.maxPages || 1000} pages and depth ${data.maxDepth || 10}`,
        });
      } else if (data.crawlType === 'individual-link') {
        // For individual links, just crawl the single page
        WebsiteCrawlService.startEnhancedCrawl(
          agentId,
          source.id,
          normalizedUrl,
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
          normalizedUrl,
          {
            maxDepth: 0,
            maxPages: data.maxPages || 1000
          }
        ).catch(error => {
          console.error('Sitemap crawl failed:', error);
        });

        toast({
          title: "Sitemap crawling started",
          description: `Sitemap processing started with max ${data.maxPages || 1000} pages`,
        });
      }

      if (onSuccess) {
        onSuccess();
      }

      return source;
    } catch (error: any) {
      console.error('Website submission error:', error);
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
