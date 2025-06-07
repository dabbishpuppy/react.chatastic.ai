
import { CrawlWorkflowService } from './CrawlWorkflowService';
import { WorkflowEngine } from './WorkflowEngine';
import { EnhancedCrawlService } from '../rag/enhanced/enhancedCrawlService';
import { AgentSource } from '@/types/rag';

/**
 * Integration service that connects the new workflow system with existing crawl operations
 */
export class WorkflowCrawlIntegration {
  /**
   * Enhanced website crawl using workflow system
   */
  static async initiateWebsiteCrawl(
    agentId: string,
    sourceId: string,
    url: string,
    options: {
      crawlMode?: 'single-page' | 'sitemap-only' | 'full-website';
      maxPages?: number;
      maxDepth?: number;
      respectRobots?: boolean;
      includePaths?: string[];
      excludePaths?: string[];
    } = {}
  ): Promise<void> {
    console.log(`🚀 Starting workflow-enhanced crawl for source: ${sourceId}`);

    const crawlConfig = {
      url,
      crawlMode: options.crawlMode || 'full-website',
      maxPages: options.maxPages || 100,
      maxDepth: options.maxDepth || 3,
      respectRobots: options.respectRobots || true,
      includePaths: options.includePaths || [],
      excludePaths: options.excludePaths || []
    };

    try {
      // Start the crawl workflow
      await CrawlWorkflowService.startCrawl(sourceId, crawlConfig);

      // The background job processor will handle the actual crawling
      console.log(`✅ Crawl workflow initiated for source: ${sourceId}`);

    } catch (error) {
      console.error(`❌ Failed to initiate crawl workflow for source: ${sourceId}`, error);
      
      // Mark source as failed
      await WorkflowEngine.transitionSourceStatus(
        sourceId,
        'ERROR',
        'CRAWL_INITIATION_FAILED',
        {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          failed_at: new Date().toISOString()
        }
      );

      throw error;
    }
  }

  /**
   * Enhanced training using workflow system
   */
  static async initiateTraining(sourceId: string): Promise<void> {
    console.log(`🎓 Starting workflow-enhanced training for source: ${sourceId}`);

    try {
      await CrawlWorkflowService.startTraining(sourceId);
      console.log(`✅ Training workflow initiated for source: ${sourceId}`);
    } catch (error) {
      console.error(`❌ Failed to initiate training workflow for source: ${sourceId}`, error);
      throw error;
    }
  }

  /**
   * Enhanced source deletion using workflow system
   */
  static async markSourceForRemoval(source: AgentSource): Promise<void> {
    console.log(`🗑️ Marking source for removal via workflow: ${source.id}`);

    try {
      await CrawlWorkflowService.markPendingRemoval(source.id);
      console.log(`✅ Source marked for removal: ${source.id}`);
    } catch (error) {
      console.error(`❌ Failed to mark source for removal: ${source.id}`, error);
      throw error;
    }
  }

  /**
   * Restore source from pending removal
   */
  static async restoreSource(source: AgentSource): Promise<void> {
    console.log(`🔄 Restoring source via workflow: ${source.id}`);

    try {
      await CrawlWorkflowService.restoreSource(source.id);
      console.log(`✅ Source restored: ${source.id}`);
    } catch (error) {
      console.error(`❌ Failed to restore source: ${source.id}`, error);
      throw error;
    }
  }

  /**
   * Check if source should use workflow system
   */
  static shouldUseWorkflow(source: AgentSource): boolean {
    // Use workflow for all website sources
    return source.source_type === 'website';
  }

  /**
   * Migrate existing source to workflow system
   */
  static async migrateSourceToWorkflow(source: AgentSource): Promise<void> {
    if (!this.shouldUseWorkflow(source)) {
      return;
    }

    console.log(`🔄 Migrating source to workflow system: ${source.id}`);

    // Determine current workflow status based on legacy status
    let workflowStatus: 'CREATED' | 'CRAWLING' | 'COMPLETED' | 'TRAINING' | 'TRAINED' | 'ERROR';

    switch (source.crawl_status) {
      case 'in_progress':
        workflowStatus = 'CRAWLING';
        break;
      case 'completed':
        workflowStatus = 'COMPLETED';
        break;
      case 'failed':
        workflowStatus = 'ERROR';
        break;
      case 'training':
        workflowStatus = 'TRAINING';
        break;
      case 'training_completed':
        workflowStatus = 'TRAINED';
        break;
      default:
        workflowStatus = 'CREATED';
    }

    try {
      await WorkflowEngine.transitionSourceStatus(
        source.id,
        workflowStatus,
        'MIGRATION_TO_WORKFLOW',
        {
          migrated_from_legacy: true,
          legacy_status: source.crawl_status,
          migrated_at: new Date().toISOString()
        }
      );

      console.log(`✅ Source migrated to workflow: ${source.id}`);
    } catch (error) {
      console.error(`❌ Failed to migrate source to workflow: ${source.id}`, error);
      throw error;
    }
  }
}
