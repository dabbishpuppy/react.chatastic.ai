
import { MetricsCollectionService } from './metricsCollectionService';
import { AlertingService } from './alertingService';
import { PerformanceMonitoringService } from './performanceMonitoringService';
import { InfrastructureMonitoringService } from './infrastructureMonitoringService';
import { IPPoolService } from './ipPoolService';
import { EgressManagementService } from './egressManagementService';
import { AutoscalingService } from './autoscalingService';
import { 
  ServiceLifecycle, 
  HealthMonitor, 
  ConfigurationManager, 
  StatusTracker,
  type ServiceStatus, 
  type OrchestrationConfig 
} from './orchestration';

export class ServiceOrchestrator {
  private static instance: ServiceOrchestrator;
  private statusTracker = new StatusTracker();
  private isRunning = false;
  private startTime = 0;
  private config: OrchestrationConfig;
  private healthMonitorInterval?: NodeJS.Timeout;

  private constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = ConfigurationManager.createConfig(config);
  }

  static getInstance(config?: Partial<OrchestrationConfig>): ServiceOrchestrator {
    if (!ServiceOrchestrator.instance) {
      ServiceOrchestrator.instance = new ServiceOrchestrator(config);
    }
    return ServiceOrchestrator.instance;
  }

  async startServices(): Promise<void> {
    if (this.isRunning) {
      console.log('🎭 Service orchestrator already running');
      return;
    }

    console.log('🎭 Starting enhanced services orchestration...');
    this.startTime = Date.now();
    this.isRunning = true;

    try {
      // Start services based on configuration
      await this.initializeServices();
      
      console.log('✅ All enhanced services started successfully');
      this.startHealthMonitoring();

    } catch (error) {
      console.error('❌ Failed to start enhanced services:', error);
      await this.stopServices();
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    const services = [
      {
        name: 'ConnectionPoolManager',
        enabled: this.config.enableConnectionPooling,
        startFn: async () => console.log('Initializing connection pools...')
      },
      {
        name: 'DatabaseOptimizationService',
        enabled: this.config.enableDatabaseOptimization,
        startFn: async () => console.log('Initializing database optimizations...')
      },
      {
        name: 'MetricsCollectionService',
        enabled: this.config.enableMetrics,
        startFn: async () => MetricsCollectionService.startCollection()
      },
      {
        name: 'AlertingService',
        enabled: this.config.enableAlerting,
        startFn: async () => AlertingService.initialize()
      },
      {
        name: 'IPPoolService',
        enabled: this.config.enableIPPoolMonitoring,
        startFn: async () => IPPoolService.startMonitoring()
      },
      {
        name: 'EgressManagementService',
        enabled: this.config.enableEgressManagement,
        startFn: async () => EgressManagementService.initialize()
      },
      {
        name: 'AutoscalingService',
        enabled: this.config.enableAutoscaling,
        startFn: async () => AutoscalingService.startAutoscaling()
      },
      {
        name: 'WorkerQueueService',
        enabled: this.config.enableWorkerQueue,
        startFn: async () => console.log('Initializing worker queue...')
      },
      {
        name: 'PerformanceMonitoringService',
        enabled: this.config.enablePerformanceMonitoring,
        startFn: async () => PerformanceMonitoringService.startMonitoring()
      },
      {
        name: 'InfrastructureMonitoringService',
        enabled: this.config.enableInfrastructureMonitoring,
        startFn: async () => InfrastructureMonitoringService.startMonitoring()
      }
    ];

    for (const service of services) {
      if (service.enabled) {
        await ServiceLifecycle.startService(
          service.name,
          service.startFn,
          (name, status) => this.statusTracker.updateServiceStatus(name, status)
        );
      }
    }
  }

  async stopServices(): Promise<void> {
    if (!this.isRunning) {
      console.log('🎭 Service orchestrator not running');
      return;
    }

    console.log('🎭 Stopping enhanced services...');

    try {
      // Stop health monitoring
      if (this.healthMonitorInterval) {
        clearInterval(this.healthMonitorInterval);
      }

      // Stop services in reverse order
      const stopOperations = [
        { name: 'InfrastructureMonitoringService', stopFn: () => InfrastructureMonitoringService.stopMonitoring() },
        { name: 'PerformanceMonitoringService', stopFn: () => PerformanceMonitoringService.stopMonitoring() },
        { name: 'AutoscalingService', stopFn: () => AutoscalingService.stopAutoscaling() },
        { name: 'IPPoolService', stopFn: () => IPPoolService.stopMonitoring() },
        { name: 'MetricsCollectionService', stopFn: () => MetricsCollectionService.stopCollection() }
      ];

      for (const operation of stopOperations) {
        await ServiceLifecycle.stopService(
          operation.name,
          operation.stopFn,
          (name, status) => this.statusTracker.updateServiceStatus(name, status)
        );
      }

      console.log('✅ All enhanced services stopped');

    } catch (error) {
      console.error('❌ Error stopping services:', error);
    } finally {
      this.isRunning = false;
      this.statusTracker.clearServices();
    }
  }

  private startHealthMonitoring(): void {
    this.healthMonitorInterval = HealthMonitor.startHealthMonitoring(
      30000, // 30 seconds
      () => this.isRunning,
      this.statusTracker.getServicesMap(),
      this.startTime,
      (name, updatedService) => this.statusTracker.updateService(name, updatedService)
    );
  }

  getOrchestratorStatus(): {
    isRunning: boolean;
    uptime: number;
    services: ServiceStatus[];
    overallHealth: number;
  } {
    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      services: this.statusTracker.getAllServices(),
      overallHealth: this.statusTracker.getOverallHealth()
    };
  }

  getServiceStatus(serviceName: string): ServiceStatus | null {
    return this.statusTracker.getServiceStatus(serviceName);
  }

  async restartService(serviceName: string): Promise<void> {
    await ServiceLifecycle.restartService(
      serviceName,
      (name, status) => this.statusTracker.updateServiceStatus(name, status)
    );
  }

  updateConfiguration(newConfig: Partial<OrchestrationConfig>): void {
    this.config = ConfigurationManager.updateConfig(this.config, newConfig);
    console.log('🔧 Orchestrator configuration updated');
  }
}
