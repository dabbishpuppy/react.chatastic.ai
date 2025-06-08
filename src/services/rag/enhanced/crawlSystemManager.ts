
import { JobHealthMonitor } from './jobHealthMonitor';
import { JobRecoveryService } from './jobRecoveryService';
import { ConcurrentJobProcessor } from './concurrentJobProcessor';
import { EnhancedJobClaimingCore } from './jobClaiming/enhancedJobClaimingCore';

export interface CrawlSystemStatus {
  isHealthy: boolean;
  activeWorkers: number;
  queueDepth: number;
  processingRate: number;
  systemLoad: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export class CrawlSystemManager {
  private static isInitialized = false;

  /**
   * Initialize the enhanced crawl system
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔧 Crawl system already initialized');
      return;
    }

    console.log('🚀 Initializing enhanced crawl system...');

    try {
      // Start health monitoring
      JobHealthMonitor.startMonitoring();

      // Perform initial recovery
      await JobRecoveryService.recoverStalledJobs();

      this.isInitialized = true;
      console.log('✅ Enhanced crawl system initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize crawl system:', error);
      throw error;
    }
  }

  /**
   * Process jobs with the enhanced concurrent system
   */
  static async processJobsConcurrently(
    jobProcessor: (job: any) => Promise<boolean>,
    options: {
      maxConcurrentJobs?: number;
      batchSize?: number;
      timeoutMs?: number;
    } = {}
  ) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const processingOptions = {
      maxConcurrentJobs: options.maxConcurrentJobs || 5,
      jobTypes: ['process_page'],
      workerId: `enhanced-worker-${Date.now()}`,
      batchSize: options.batchSize || 10,
      timeoutMs: options.timeoutMs || 10 * 60 * 1000
    };

    console.log('🔄 Starting enhanced concurrent job processing...');
    
    return await ConcurrentJobProcessor.processConcurrentJobs(
      jobProcessor,
      processingOptions
    );
  }

  /**
   * Get comprehensive system status
   */
  static async getSystemStatus(): Promise<CrawlSystemStatus> {
    try {
      const [healthMetrics, claimingStats] = await Promise.all([
        JobHealthMonitor.getCurrentHealth(),
        EnhancedJobClaimingCore.getClaimingStats()
      ]);

      const systemLoad = this.calculateSystemLoad(healthMetrics);
      const recommendations = this.generateRecommendations(healthMetrics, claimingStats);

      return {
        isHealthy: healthMetrics.systemHealth.overallStatus === 'healthy',
        activeWorkers: healthMetrics.processingHealth.activeWorkers,
        queueDepth: healthMetrics.queueHealth.totalPending,
        processingRate: healthMetrics.processingHealth.throughputPerMinute,
        systemLoad,
        recommendations
      };

    } catch (error) {
      console.error('❌ Error getting system status:', error);
      return {
        isHealthy: false,
        activeWorkers: 0,
        queueDepth: 0,
        processingRate: 0,
        systemLoad: 'critical',
        recommendations: ['System status check failed - manual intervention required']
      };
    }
  }

  /**
   * Trigger manual recovery
   */
  static async triggerRecovery(): Promise<{
    success: boolean;
    recoveredJobs: number;
    message: string;
  }> {
    try {
      console.log('🔧 Triggering manual system recovery...');
      
      const metrics = await JobRecoveryService.recoverStalledJobs();
      
      return {
        success: true,
        recoveredJobs: metrics.recoveredJobs,
        message: `Recovery completed: ${metrics.recoveredJobs} jobs recovered, ${metrics.orphanedJobs} orphaned pages fixed`
      };

    } catch (error) {
      console.error('❌ Manual recovery failed:', error);
      return {
        success: false,
        recoveredJobs: 0,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Calculate system load based on metrics
   */
  private static calculateSystemLoad(metrics: any): 'low' | 'medium' | 'high' | 'critical' {
    const { queueHealth, processingHealth, systemHealth } = metrics;

    if (systemHealth.overallStatus === 'critical') {
      return 'critical';
    }

    if (queueHealth.totalPending > 100 || processingHealth.successRate < 0.7) {
      return 'high';
    }

    if (queueHealth.totalPending > 25 || processingHealth.activeWorkers < 2) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate system recommendations
   */
  private static generateRecommendations(healthMetrics: any, claimingStats: any): string[] {
    const recommendations: string[] = [];
    const { queueHealth, processingHealth, systemHealth } = healthMetrics;

    if (systemHealth.stalledJobs > 0) {
      recommendations.push(`${systemHealth.stalledJobs} stalled jobs detected - consider running recovery`);
    }

    if (queueHealth.totalPending > 50) {
      recommendations.push('High queue depth - consider increasing concurrent workers');
    }

    if (processingHealth.successRate < 0.8) {
      recommendations.push('Low success rate - check for system issues or job complexity');
    }

    if (processingHealth.activeWorkers === 0 && queueHealth.totalPending > 0) {
      recommendations.push('No active workers detected - start job processing');
    }

    if (queueHealth.oldestPendingAge > 30 * 60 * 1000) {
      recommendations.push('Old pending jobs detected - investigate processing bottlenecks');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating normally');
    }

    return recommendations;
  }

  /**
   * Shutdown the system gracefully
   */
  static shutdown(): void {
    console.log('🛑 Shutting down enhanced crawl system...');
    
    JobHealthMonitor.stopMonitoring();
    this.isInitialized = false;
    
    console.log('✅ Crawl system shutdown complete');
  }
}
