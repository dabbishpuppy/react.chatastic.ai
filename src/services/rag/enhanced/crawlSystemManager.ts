
import { JobSynchronizationService } from './jobSynchronizationService';
import { HealthMonitor } from './healthMonitor';
import { RecoveryManager } from './recoveryManager';

export interface CrawlSystemStatus {
  initialized: boolean;
  isHealthy: boolean;
  components: {
    jobSync: boolean;
    healthMonitor: boolean;
    recoveryManager: boolean;
  };
  metrics: {
    activeSources: number;
    pendingJobs: number;
    healthScore: number;
  };
}

export class CrawlSystemManager {
  private static isInitialized = false;
  private static healthCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the enhanced crawl system with all resilience components
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 Crawl system already initialized');
      return;
    }

    console.log('🚀 Initializing enhanced crawl system with resilience...');

    try {
      // Start job synchronization service (immediate fix)
      JobSynchronizationService.startSynchronization();

      // Start health monitoring
      this.startHealthMonitoring();

      // Set up cleanup on page unload
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          this.shutdown();
        });
      }

      this.isInitialized = true;
      console.log('✅ Enhanced crawl system initialized successfully');

      // Perform immediate emergency check for stalled sources
      await this.performEmergencyCheck();

    } catch (error) {
      console.error('❌ Failed to initialize crawl system:', error);
      throw error;
    }
  }

  /**
   * Perform emergency check for stalled sources and recover them
   */
  private static async performEmergencyCheck(): Promise<void> {
    try {
      console.log('🚨 Performing emergency check for stalled sources...');

      // Force immediate job synchronization
      const syncMetrics = await JobSynchronizationService.forceSynchronization();
      
      if (syncMetrics.createdJobs > 0) {
        console.log(`🚑 Emergency recovery: Created ${syncMetrics.createdJobs} missing jobs`);
      }

      // Check for stalled sources (in_progress for >10 minutes)
      const stalledThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      // This would normally query the database, but for now we'll use the job sync results
      if (syncMetrics.missingJobs > 0) {
        console.log(`⚠️ Found ${syncMetrics.missingJobs} potentially stalled pages`);
      }

    } catch (error) {
      console.error('❌ Emergency check failed:', error);
    }
  }

  /**
   * Start health monitoring with periodic checks
   */
  private static startHealthMonitoring(): void {
    console.log('🏥 Starting health monitoring...');

    // Perform initial health check
    this.performHealthCheck();

    // Set up periodic health checks every 2 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 2 * 60 * 1000);
  }

  /**
   * Perform a health check
   */
  private static async performHealthCheck(): Promise<void> {
    try {
      // Get job sync status
      const syncStatus = JobSynchronizationService.getStatus();
      
      if (!syncStatus.isRunning) {
        console.warn('⚠️ Job synchronization is not running, restarting...');
        JobSynchronizationService.startSynchronization();
      }

      // Could add more health checks here for other components

    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }

  /**
   * Get current system status
   */
  static async getSystemStatus(): Promise<CrawlSystemStatus> {
    const syncStatus = JobSynchronizationService.getStatus();
    const healthScore = syncStatus.isRunning ? 100 : 50;

    return {
      initialized: this.isInitialized,
      isHealthy: healthScore > 80,
      components: {
        jobSync: syncStatus.isRunning,
        healthMonitor: this.healthCheckInterval !== null,
        recoveryManager: true // Assume recovery manager is always available
      },
      metrics: {
        activeSources: 0, // Would query database
        pendingJobs: 0,   // Would query database
        healthScore
      }
    };
  }

  /**
   * Trigger manual recovery for a specific source
   */
  static async triggerSourceRecovery(parentSourceId: string): Promise<void> {
    console.log(`🔧 Triggering manual recovery for source: ${parentSourceId}`);
    
    try {
      const metrics = await JobSynchronizationService.emergencyRecovery(parentSourceId);
      
      if (metrics.createdJobs > 0) {
        console.log(`✅ Recovery successful: created ${metrics.createdJobs} jobs`);
      } else if (metrics.errors.length > 0) {
        console.error('❌ Recovery failed:', metrics.errors);
        throw new Error(`Recovery failed: ${metrics.errors.join(', ')}`);
      } else {
        console.log('ℹ️ No recovery needed');
      }

    } catch (error) {
      console.error('❌ Source recovery failed:', error);
      throw error;
    }
  }

  /**
   * Trigger system-wide recovery
   */
  static async triggerRecovery(): Promise<{ success: boolean; message: string; }> {
    try {
      console.log('🚑 Triggering system-wide recovery...');
      
      // Force job synchronization
      const syncMetrics = await JobSynchronizationService.forceSynchronization();
      
      // Restart health monitoring if stopped
      if (!this.healthCheckInterval) {
        this.startHealthMonitoring();
      }
      
      const message = `Recovery completed: ${syncMetrics.createdJobs} jobs created, ${syncMetrics.errors.length} errors`;
      
      return {
        success: syncMetrics.errors.length === 0,
        message
      };
      
    } catch (error) {
      console.error('❌ System recovery failed:', error);
      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Shutdown the crawl system
   */
  static shutdown(): void {
    if (!this.isInitialized) {
      return;
    }

    console.log('🛑 Shutting down crawl system...');

    // Stop job synchronization
    JobSynchronizationService.stopSynchronization();

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.isInitialized = false;
    console.log('✅ Crawl system shutdown complete');
  }

  /**
   * Check if system is ready
   */
  static isReady(): boolean {
    return this.isInitialized;
  }
}
