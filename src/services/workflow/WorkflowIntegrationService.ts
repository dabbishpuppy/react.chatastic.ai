
import { CrawlWorkflowService } from './CrawlWorkflowService';
import { AgentSource } from '@/types/rag';
import { SourceDeleteService } from '../rag/operations/SourceDeleteService';

/**
 * Service to integrate the new workflow system with existing operations
 * This provides a bridge between the legacy code and the new workflow engine
 */
export class WorkflowIntegrationService {
  /**
   * Handle source removal using the comprehensive deletion service
   */
  static async handleSourceRemoval(source: AgentSource): Promise<void> {
    console.log('🗑️ Handling source removal via comprehensive deletion:', source.id);
    
    try {
      // Use the comprehensive deletion service that properly handles foreign key constraints
      await SourceDeleteService.deleteSource(source.id);
    } catch (error) {
      console.error('❌ Error during source removal:', error);
      throw error;
    }
  }

  /**
   * Handle source restoration using the workflow system
   */
  static async handleSourceRestore(source: AgentSource): Promise<void> {
    console.log('🔄 Handling source restore via workflow system:', source.id);
    
    try {
      await CrawlWorkflowService.restoreSource(source.id);
    } catch (error) {
      console.error('❌ Error restoring source:', error);
      throw error;
    }
  }

  /**
   * Handle training initiation using the workflow system
   */
  static async handleTrainingStart(sourceId: string): Promise<void> {
    console.log('🎓 Handling training start via workflow system:', sourceId);
    
    try {
      await CrawlWorkflowService.startTraining(sourceId);
    } catch (error) {
      console.error('❌ Error starting training:', error);
      throw error;
    }
  }

  /**
   * Check if source should use workflow system
   */
  static shouldUseWorkflow(source: AgentSource): boolean {
    // For now, use workflow for all website sources
    // Can be expanded to include other conditions
    return source.source_type === 'website';
  }

  /**
   * Get display status from workflow status
   */
  static getDisplayStatus(source: AgentSource): string {
    if (source.workflow_status) {
      switch (source.workflow_status) {
        case 'CREATED':
          return 'pending';
        case 'CRAWLING':
          return 'in_progress';
        case 'COMPLETED':
          return 'completed';
        case 'TRAINING':
          return 'training';
        case 'TRAINED':
          return 'trained';
        case 'PENDING_REMOVAL':
          return 'pending_removal';
        case 'REMOVED':
          return 'removed';
        case 'ERROR':
          return 'failed';
        default:
          return source.crawl_status || 'pending';
      }
    }
    
    // Fallback to legacy status
    return source.crawl_status || 'pending';
  }

  /**
   * Check if source is pending removal
   */
  static isPendingRemoval(source: AgentSource): boolean {
    return source.workflow_status === 'PENDING_REMOVAL' || source.pending_deletion === true;
  }

  /**
   * Check if source can be restored
   */
  static canRestore(source: AgentSource): boolean {
    return this.isPendingRemoval(source);
  }

  /**
   * Check if source can be deleted (hard delete)
   */
  static canDelete(source: AgentSource): boolean {
    return !this.isPendingRemoval(source);
  }
}
