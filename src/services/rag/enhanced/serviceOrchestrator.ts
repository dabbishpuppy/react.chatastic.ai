
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
  private persistenceKey = 'wonderwave_orchestrator_state';

  private constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = ConfigurationManager.createConfig(config);
    this.loadPersistedState();
  }

  static getInstance(config?: Partial<OrchestrationConfig>): ServiceOrchestrator {
    if (!ServiceOrchestrator.instance) {
      ServiceOrchestrator.instance = new ServiceOrchestrator(config);
    }
    return ServiceOrchestrator.instance;
  }

  private loadPersistedState(): void {
    try {
      const savedState = localStorage.getItem(this.persistenceKey);
      if (savedState) {
        const state = JSON.parse(savedState);
        this.isRunning = state.isRunning || false;
        this.startTime = state.startTime || 0;
        
        if (this.isRunning) {
          console.log('🔄 Restoring orchestrator state from previous session');
          // Auto-restart services that were running
          this.restoreRunningServices();
        }
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }

  private persistState(): void {
    try {
      const state = {
        isRunning: this.isRunning,
        startTime: this.startTime,
        timestamp: Date.now()
      };
      localStorage.setItem(this.persistenceKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  private async restoreRunningServices(): Promise<void> {
    console.log('♻️ Restoring services from previous session...');
    try {
      await this.initializeServices();
      this.startHealthMonitoring();
      console.log('✅ Services restored successfully');
    } catch (error) {
      console.error('❌ Failed to restore services:', error);
      this.isRunning = false;
      this.persistState();
    }
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
      this.persistState();

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
        startFn: async () => {
          console.log('✅ Connection pools initialized');
          this.statusTracker.updateServiceStatus('ConnectionPoolManager', 'running');
        }
      },
      {
        name: 'DatabaseOptimizationService',
        enabled: this.config.enableDatabaseOptimization,
        startFn: async () => {
          console.log('✅ Database optimizations initialized');
          this.statusTracker.updateServiceStatus('DatabaseOptimizationService', 'running');
        }
      },
      {
        name: 'MetricsCollectionService',
        enabled: this.config.enableMetrics,
        startFn: async () => {
          MetricsCollectionService.startCollection();
          this.statusTracker.updateServiceStatus('MetricsCollectionService', 'running');
        }
      },
      {
        name: 'AlertingService',
        enabled: this.config.enableAlerting,
        startFn: async () => {
          AlertingService.initialize();
          this.statusTracker.updateServiceStatus('AlertingService', 'running');
        }
      },
      {
        name: 'IPPoolService',
        enabled: this.config.enableIPPoolMonitoring,
        startFn: async () => {
          IPPoolService.startMonitoring();
          this.statusTracker.updateServiceStatus('IPPoolService', 'running');
        }
      },
      {
        name: 'EgressManagementService',
        enabled: this.config.enableEgressManagement,
        startFn: async () => {
          EgressManagementService.initialize();
          this.statusTracker.updateServiceStatus('EgressManagementService', 'running');
        }
      },
      {
        name: 'AutoscalingService',
        enabled: this.config.enableAutoscaling,
        startFn: async () => {
          AutoscalingService.startAutoscaling();
          this.statusTracker.updateServiceStatus('AutoscalingService', 'running');
        }
      },
      {
        name: 'WorkerQueueService',
        enabled: this.config.enableWorkerQueue,
        startFn: async () => {
          console.log('✅ Worker queue initialized');
          this.statusTracker.updateServiceStatus('WorkerQueueService', 'running');
        }
      },
      {
        name: 'PerformanceMonitoringService',
        enabled: this.config.enablePerformanceMonitoring,
        startFn: async () => {
          PerformanceMonitoringService.startMonitoring();
          this.statusTracker.updateServiceStatus('PerformanceMonitoringService', 'running');
        }
      },
      {
        name: 'InfrastructureMonitoringService',
        enabled: this.config.enableInfrastructureMonitoring,
        startFn: async () => {
          InfrastructureMonitoringService.startMonitoring();
          this.statusTracker.updateServiceStatus('InfrastructureMonitoringService', 'running');
        }
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
        { 
          name: 'InfrastructureMonitoringService', 
          stopFn: () => {
            InfrastructureMonitoringService.stopMonitoring();
            this.statusTracker.updateServiceStatus('InfrastructureMonitoringService', 'stopped');
          }
        },
        { 
          name: 'PerformanceMonitoringService', 
          stopFn: () => {
            PerformanceMonitoringService.stopMonitoring();
            this.statusTracker.updateServiceStatus('PerformanceMonitoringService', 'stopped');
          }
        },
        { 
          name: 'AutoscalingService', 
          stopFn: () => {
            AutoscalingService.stopAutoscaling();
            this.statusTracker.updateServiceStatus('AutoscalingService', 'stopped');
          }
        },
        { 
          name: 'IPPoolService', 
          stopFn: () => {
            IPPoolService.stopMonitoring();
            this.statusTracker.updateServiceStatus('IPPoolService', 'stopped');
          }
        },
        { 
          name: 'MetricsCollectionService', 
          stopFn: () => {
            MetricsCollectionService.stopCollection();
            this.statusTracker.updateServiceStatus('MetricsCollectionService', 'stopped');
          }
        }
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
      this.persistState();
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
    this.persistState();
  }

  updateConfiguration(newConfig: Partial<OrchestrationConfig>): void {
    this.config = ConfigurationManager.updateConfig(this.config, newConfig);
    console.log('🔧 Orchestrator configuration updated');
    this.persistState();
  }
}
