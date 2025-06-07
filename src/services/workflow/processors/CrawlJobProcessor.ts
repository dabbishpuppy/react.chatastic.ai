
import { BackgroundJobProcessor } from './BackgroundJobProcessor';
import { BackgroundJob } from '../types';
import { WorkflowEngine } from '../WorkflowEngine';
import { supabase } from '@/integrations/supabase/client';

/**
 * Processor for crawl jobs
 */
export class CrawlJobProcessor extends BackgroundJobProcessor {
  protected jobType = 'crawl_pages';

  protected async processJob(job: BackgroundJob): Promise<void> {
    console.log(`🔄 Processing crawl job: ${job.id} for source: ${job.source_id}`);

    const config = job.payload.config;
    if (!config) {
      throw new Error('No crawl config provided in job payload');
    }

    try {
      // Transition source to CRAWLING if not already
      await WorkflowEngine.transitionSourceStatus(
        job.source_id,
        'CRAWLING',
        'CRAWL_PROCESSING',
        {
          job_id: job.id,
          started_at: new Date().toISOString()
        }
      );

      // Call the existing crawl processing function
      const { data: result, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          ...config,
          sourceId: job.source_id,
          mode: 'process_existing'
        }
      });

      if (error) {
        throw new Error(`Crawl function error: ${error.message}`);
      }

      if (!result || !result.success) {
        throw new Error(result?.error || 'Crawl processing failed');
      }

      // Transition to COMPLETED status
      await WorkflowEngine.transitionSourceStatus(
        job.source_id,
        'COMPLETED',
        'CRAWL_COMPLETED',
        {
          job_id: job.id,
          completed_at: new Date().toISOString(),
          crawl_result: result
        }
      );

      console.log(`✅ Crawl job completed: ${job.id}`);

    } catch (error) {
      console.error(`❌ Crawl job failed: ${job.id}`, error);
      
      // Transition to ERROR status
      await WorkflowEngine.transitionSourceStatus(
        job.source_id,
        'ERROR',
        'CRAWL_FAILED',
        {
          job_id: job.id,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          failed_at: new Date().toISOString()
        }
      );

      throw error;
    }
  }
}
