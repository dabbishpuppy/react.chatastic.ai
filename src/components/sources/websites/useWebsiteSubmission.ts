
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AgentSourceService } from '@/services/rag/agentSourceService';
import { EnhancedCrawlService } from '@/services/rag/enhanced/enhancedCrawlService';
import { ToastNotificationService } from '@/services/ToastNotificationService';

interface WebsiteSubmissionData {
  url: string;
  respectRobots: boolean;
  excludePaths: string[];
  includePaths: string[];
  maxConcurrentJobs: number;
}

export const useWebsiteSubmission = () => {
  const { agentId } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitWebsite = async (data: WebsiteSubmissionData) => {
    if (!agentId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      console.log('🚀 Starting website crawl submission:', data.url);

      // Create the website source with pending status
      const source = await AgentSourceService.createSource({
        agent_id: agentId,
        team_id: 'temp-team-id', // This should come from context
        source_type: 'website',
        title: data.url,
        url: data.url,
        crawl_status: 'pending',
        exclude_paths: data.excludePaths,
        include_paths: data.includePaths,
        respect_robots: data.respectRobots,
        max_concurrent_jobs: data.maxConcurrentJobs,
        metadata: {
          submission_timestamp: new Date().toISOString(),
          simplified_flow: true
        }
      });

      console.log('✅ Website source created:', source.id);

      // Immediately emit source creation event for real-time UI update
      window.dispatchEvent(new CustomEvent('sourceCreated', {
        detail: { 
          sourceId: source.id, 
          agentId,
          sourceType: 'website',
          source: source
        }
      }));

      // Show initial toast
      ToastNotificationService.showCrawlingStarted();
      window.dispatchEvent(new CustomEvent('crawlStarted', {
        detail: { sourceId: source.id }
      }));

      // Update status to crawling and trigger UI update
      await AgentSourceService.updateSource(source.id, {
        crawl_status: 'crawling'
      });

      // Emit another update event
      window.dispatchEvent(new CustomEvent('sourceUpdated', {
        detail: { sourceId: source.id }
      }));

      // Start the enhanced crawl process in the background
      try {
        const crawlResult = await EnhancedCrawlService.initiateCrawl({
          url: data.url,
          agentId,
          excludePaths: data.excludePaths,
          includePaths: data.includePaths,
          respectRobots: data.respectRobots
        });

        console.log('✅ Enhanced crawl initiated:', crawlResult);

        // Update status to crawled when complete
        await AgentSourceService.updateSource(source.id, {
          crawl_status: 'crawled',
          requires_manual_training: true // Needs training
        });

        // Emit crawling completed event
        ToastNotificationService.showCrawlingCompleted();
        window.dispatchEvent(new CustomEvent('crawlCompleted', {
          detail: { sourceId: source.id }
        }));
        window.dispatchEvent(new CustomEvent('sourceUpdated', {
          detail: { sourceId: source.id }
        }));

      } catch (crawlError) {
        console.error('❌ Crawl failed:', crawlError);
        
        // Update source status to failed
        await AgentSourceService.updateSource(source.id, {
          crawl_status: 'failed',
          metadata: {
            ...source.metadata,
            error: crawlError.message,
            failed_at: new Date().toISOString()
          }
        });

        // Emit update event even for failures
        window.dispatchEvent(new CustomEvent('sourceUpdated', {
          detail: { sourceId: source.id }
        }));
      }

      return source;
    } catch (error) {
      console.error('❌ Website submission failed:', error);
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
