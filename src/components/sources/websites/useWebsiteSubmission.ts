
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

      // Emit crawling started event and show toast
      ToastNotificationService.showCrawlingStarted();
      window.dispatchEvent(new CustomEvent('crawlStarted'));

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

      // Update status to crawling
      await AgentSourceService.updateSource(source.id, {
        crawl_status: 'crawling'
      });

      // Start the enhanced crawl process - use the correct interface properties
      const crawlResult = await EnhancedCrawlService.initiateCrawl({
        url: data.url,
        agentId,
        excludePaths: data.excludePaths,
        includePaths: data.includePaths,
        respectRobots: data.respectRobots,
        maxConcurrentJobs: data.maxConcurrentJobs
      });

      // Update status to crawled when complete
      await AgentSourceService.updateSource(source.id, {
        crawl_status: 'crawled',
        requires_manual_training: true // Needs training
      });

      // Emit crawling completed event
      ToastNotificationService.showCrawlingCompleted();
      window.dispatchEvent(new CustomEvent('crawlCompleted'));
      window.dispatchEvent(new CustomEvent('sourceUpdated'));

      return source;
    } catch (error) {
      console.error('Website submission failed:', error);
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
