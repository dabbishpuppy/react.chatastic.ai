
import { ResilientCrawlService } from './resilientCrawlService';
import { ProductionWorkerQueue } from './productionWorkerQueue';
import { MonitoringAndAlertingService } from './monitoringAndAlerting';

export class ResilienceStartupService {
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Resilience system already initialized');
      return;
    }

    console.log('🚀 Initializing production resilience system...');

    try {
      // 1. Start health monitoring
      ResilientCrawlService.startHealthMonitoring();

      // 2. Start worker queue processor
      await ProductionWorkerQueue.startQueueProcessor();

      // 3. Start monitoring and alerting
      await MonitoringAndAlertingService.startMonitoring();

      // 4. Set up cleanup on page unload
      window.addEventListener('beforeunload', () => {
        this.shutdown();
      });

      this.isInitialized = true;
      console.log('✅ Production resilience system initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize resilience system:', error);
      throw error;
    }
  }

  static shutdown(): void {
    if (!this.isInitialized) {
      return;
    }

    console.log('🛑 Shutting down resilience system...');
    
    ResilientCrawlService.stopHealthMonitoring();
    ProductionWorkerQueue.stopQueueProcessor();
    MonitoringAndAlertingService.stopMonitoring();
    
    this.isInitialized = false;
    console.log('✅ Resilience system shutdown complete');
  }

  static isReady(): boolean {
    return this.isInitialized;
  }

  static async getSystemStatus(): Promise<{
    initialized: boolean;
    components: {
      healthMonitoring: boolean;
      workerQueue: boolean;
      monitoring: boolean;
    };
    overallHealth: 'healthy' | 'degraded' | 'critical';
  }> {
    const systemStatus = ResilientCrawlService.getSystemStatus();
    const queueHealth = await ProductionWorkerQueue.getHealthStatus();
    const monitoringHealth = await MonitoringAndAlertingService.getSystemHealthSummary();

    return {
      initialized: this.isInitialized,
      components: {
        healthMonitoring: this.isInitialized,
        workerQueue: queueHealth.healthy,
        monitoring: monitoringHealth.status !== 'critical'
      },
      overallHealth: systemStatus.overallHealth
    };
  }
}
