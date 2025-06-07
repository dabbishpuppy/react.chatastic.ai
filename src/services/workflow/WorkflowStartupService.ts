
import { jobProcessorManager } from './processors/JobProcessorManager';
import { WorkflowRealtimeService } from './WorkflowRealtimeService';

/**
 * Service to handle workflow system startup and initialization
 */
export class WorkflowStartupService {
  private static isInitialized = false;

  /**
   * Initialize the complete workflow system
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Workflow system already initialized');
      return;
    }

    console.log('🚀 Initializing workflow system...');

    try {
      // Start job processors
      await jobProcessorManager.startAll();
      
      this.isInitialized = true;
      console.log('✅ Workflow system initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize workflow system:', error);
      throw error;
    }
  }

  /**
   * Shutdown the workflow system
   */
  static shutdown(): void {
    if (!this.isInitialized) {
      return;
    }

    console.log('🛑 Shutting down workflow system...');
    
    // Stop job processors
    jobProcessorManager.stopAll();
    
    // Unsubscribe from real-time events
    WorkflowRealtimeService.unsubscribeAll();
    
    this.isInitialized = false;
    console.log('✅ Workflow system shutdown complete');
  }

  /**
   * Check if the workflow system is initialized
   */
  static isReady(): boolean {
    return this.isInitialized;
  }
}
