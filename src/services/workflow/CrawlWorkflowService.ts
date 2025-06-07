
import { WorkflowEngine } from './WorkflowEngine';
import { WorkflowRealtimeService } from './WorkflowRealtimeService';
import { supabase } from '@/integrations/supabase/client';

export class CrawlWorkflowService {
  /**
   * Start crawl workflow for a source
   */
  static async startCrawl(
    sourceId: string,
    crawlConfig: {
      url: string;
      crawlMode: 'single-page' | 'sitemap-only' | 'full-website';
      maxPages: number;
      maxDepth: number;
      respectRobots: boolean;
      includePaths: string[];
      excludePaths: string[];
    }
  ): Promise<void> {
    console.log(`🚀 Starting crawl workflow for source: ${sourceId}`);

    // Transition source to CRAWLING status
    await WorkflowEngine.transitionSourceStatus(
      sourceId,
      'CRAWLING',
      'CRAWL_STARTED',
      {
        crawl_config: crawlConfig,
        started_at: new Date().toISOString()
      }
    );

    // Enqueue crawl job
    await WorkflowEngine.enqueueJob(
      'crawl_pages',
      sourceId,
      undefined,
      `crawl:${sourceId}`,
      {
        config: crawlConfig,
        source_id: sourceId
      },
      50 // High priority for crawl jobs
    );

    console.log(`✅ Crawl workflow started for source: ${sourceId}`);
  }

  /**
   * Handle page crawl completion
   */
  static async handlePageCompleted(
    pageId: string,
    crawlResult: {
      success: boolean;
      contentSize?: number;
      chunksCreated?: number;
      compressionRatio?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    const newStatus = crawlResult.success ? 'COMPLETED' : 'ERROR';
    
    await WorkflowEngine.transitionPageStatus(
      pageId,
      newStatus,
      'PAGE_CRAWL_COMPLETED',
      {
        crawl_result: crawlResult,
        completed_at: new Date().toISOString()
      }
    );
  }

  /**
   * Handle source crawl completion
   */
  static async handleSourceCrawlCompleted(
    sourceId: string,
    crawlSummary: {
      totalPages: number;
      completedPages: number;
      failedPages: number;
      totalContentSize: number;
      avgCompressionRatio: number;
    }
  ): Promise<void> {
    await WorkflowEngine.transitionSourceStatus(
      sourceId,
      'COMPLETED',
      'CRAWL_COMPLETED',
      {
        crawl_summary: crawlSummary,
        completed_at: new Date().toISOString()
      }
    );

    console.log(`✅ Source crawl completed: ${sourceId}`);
  }

  /**
   * Start training workflow for a source
   */
  static async startTraining(sourceId: string): Promise<void> {
    console.log(`🎓 Starting training workflow for source: ${sourceId}`);

    // Check if source is pending removal - if so, delete it first
    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('workflow_status')
      .eq('id', sourceId)
      .single();

    if (error) {
      console.error('❌ Error checking source status:', error);
      throw error;
    }

    if (source?.workflow_status === 'PENDING_REMOVAL') {
      console.log('🗑️ Source is pending removal, deleting instead of training');
      await this.deleteSource(sourceId);
      return;
    }

    // Transition to TRAINING status
    await WorkflowEngine.transitionSourceStatus(
      sourceId,
      'TRAINING',
      'TRAINING_STARTED',
      {
        started_at: new Date().toISOString()
      }
    );

    // Enqueue training job
    await WorkflowEngine.enqueueJob(
      'train_pages',
      sourceId,
      undefined,
      `train:${sourceId}`,
      {
        source_id: sourceId
      },
      75 // High priority for training jobs
    );

    console.log(`✅ Training workflow started for source: ${sourceId}`);
  }

  /**
   * Mark source as pending removal
   */
  static async markPendingRemoval(sourceId: string): Promise<void> {
    console.log(`⏳ Marking source as pending removal: ${sourceId}`);

    await WorkflowEngine.transitionSourceStatus(
      sourceId,
      'PENDING_REMOVAL',
      'MARKED_PENDING_REMOVAL',
      {
        marked_at: new Date().toISOString()
      }
    );

    // Also mark all pages as pending removal
    const { data: pages, error } = await supabase
      .from('source_pages')
      .select('id')
      .eq('parent_source_id', sourceId);

    if (error) {
      console.error('❌ Error fetching pages for removal:', error);
      throw error;
    }

    // Mark all pages as pending removal
    if (pages) {
      await Promise.all(
        pages.map(page => 
          WorkflowEngine.transitionPageStatus(
            page.id,
            'PENDING_REMOVAL',
            'MARKED_PENDING_REMOVAL'
          )
        )
      );
    }

    console.log(`✅ Source marked as pending removal: ${sourceId}`);
  }

  /**
   * Restore source from pending removal
   */
  static async restoreSource(sourceId: string): Promise<void> {
    console.log(`🔄 Restoring source from pending removal: ${sourceId}`);

    // Get the previous status
    const { data: source, error } = await supabase
      .from('agent_sources')
      .select('previous_status')
      .eq('id', sourceId)
      .single();

    if (error) {
      console.error('❌ Error fetching source for restore:', error);
      throw error;
    }

    const previousStatus = source?.previous_status || 'CREATED';

    await WorkflowEngine.transitionSourceStatus(
      sourceId,
      previousStatus,
      'SOURCE_RESTORED',
      {
        restored_at: new Date().toISOString(),
        restored_from: 'PENDING_REMOVAL'
      }
    );

    // Also restore all pages
    const { data: pages, error: pagesError } = await supabase
      .from('source_pages')
      .select('id, previous_status')
      .eq('parent_source_id', sourceId);

    if (pagesError) {
      console.error('❌ Error fetching pages for restore:', pagesError);
      throw pagesError;
    }

    if (pages) {
      await Promise.all(
        pages.map(page => 
          WorkflowEngine.transitionPageStatus(
            page.id,
            page.previous_status || 'CREATED',
            'PAGE_RESTORED'
          )
        )
      );
    }

    console.log(`✅ Source restored: ${sourceId}`);
  }

  /**
   * Actually delete a source (hard delete)
   */
  static async deleteSource(sourceId: string): Promise<void> {
    console.log(`🗑️ Hard deleting source: ${sourceId}`);

    await WorkflowEngine.transitionSourceStatus(
      sourceId,
      'REMOVED',
      'SOURCE_DELETED',
      {
        deleted_at: new Date().toISOString()
      }
    );

    // Note: The actual deletion of database records should be handled
    // by the existing deletion logic in your services
    console.log(`✅ Source deleted: ${sourceId}`);
  }
}
