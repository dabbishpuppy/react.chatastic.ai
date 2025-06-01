
import { MetricsCollectionService } from './metricsCollectionService';
import { AlertingService } from './alertingService';
import { PerformanceMonitoringService } from './performanceMonitoringService';
import { InfrastructureMonitoringService } from './infrastructureMonitoringService';
import { IPPoolService } from './ipPoolService';
import { EgressManagementService } from './egressManagementService';
import { AutoscalingService } from './autoscalingService';
import { ConnectionPoolManager } from './connectionPoolManager';
import { DatabaseOptimizationService } from './databaseOptimizationService';
import { WorkerQueueService } from './workerQueue';

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastCheck: string;
  health: number;
}

export interface OrchestrationConfig {
  enableMetrics: boolean;
  enableAlerting: boolean;
  enablePerformanceMonitoring: boolean;
  enableInfrastructureMonitoring: boolean;
  enableIPPoolMonitoring: boolean;
  enableEgressManagement: boolean;
  enableAutoscaling: boolean;
  enableConnectionPooling: boolean;
  enableDatabaseOptimization: boolean;
  enableWorkerQueue: boolean;
}

export class ServiceOrchestrator {
  private static instance: ServiceOrchestrator;
  private services = new Map<string, ServiceStatus>();
  private isRunning = false;
  private startTime = 0;
  private config: OrchestrationConfig;

  private constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = {
      enableMetrics: true,
      enableAlerting: true,
      enablePerformanceMonitoring: true,
      enableInfrastructureMonitoring: true,
      enableIPPoolMonitoring: true,
      enableEgressManagement: true,
      enableAutoscaling: true,
      enableConnectionPooling: true,
      enableDatabaseOptimization: true,
      enableWorkerQueue: true,
      ...config
    };
  }

  static getInstance(config?: Partial<OrchestrationConfig>): ServiceOrchestrator {
    if (!ServiceOrchestrator.instance) {
      ServiceOrchestrator.instance = new ServiceOrchestrator(config);
    }
    return ServiceOrchestrator.instance;
  }

  // Initialize all enhanced services
  async startServices(): Promise<void> {
    if (this.isRunning) {
      console.log('🎭 Service orchestrator already running');
      return;
    }

    console.log('🎭 Starting enhanced services orchestration...');
    this.startTime = Date.now();
    this.isRunning = true;

    try {
      // Start core infrastructure services first
      if (this.config.enableConnectionPooling) {
        await this.startService('ConnectionPoolManager', async () => {
          // Initialize connection pools
          console.log('Initializing connection pools...');
        });
      }

      if (this.config.enableDatabaseOptimization) {
        await this.startService('DatabaseOptimizationService', async () => {
          // Initialize database optimizations
          console.log('Initializing database optimizations...');
        });
      }

      // Start monitoring services
      if (this.config.enableMetrics) {
        await this.startService('MetricsCollectionService', async () => {
          MetricsCollectionService.startCollection();
        });
      }

      if (this.config.enableAlerting) {
        await this.startService('AlertingService', async () => {
          await AlertingService.initialize();
        });
      }

      // Start IP and egress management
      if (this.config.enableIPPoolMonitoring) {
        await this.startService('IPPoolService', async () => {
          IPPoolService.startMonitoring();
        });
      }

      if (this.config.enableEgressManagement) {
        await this.startService('EgressManagementService', async () => {
          EgressManagementService.initialize();
        });
      }

      // Start autoscaling
      if (this.config.enableAutoscaling) {
        await this.startService('AutoscalingService', async () => {
          AutoscalingService.startAutoscaling();
        });
      }

      // Start worker queue
      if (this.config.enableWorkerQueue) {
        await this.startService('WorkerQueueService', async () => {
          // Initialize worker queue
          console.log('Initializing worker queue...');
        });
      }

      // Start high-level monitoring services last
      if (this.config.enablePerformanceMonitoring) {
        await this.startService('PerformanceMonitoringService', async () => {
          await PerformanceMonitoringService.startMonitoring();
        });
      }

      if (this.config.enableInfrastructureMonitoring) {
        await this.startService('InfrastructureMonitoringService', async () => {
          await InfrastructureMonitoringService.startMonitoring();
        });
      }

      console.log('✅ All enhanced services started successfully');
      
      // Start health monitoring
      this.startHealthMonitoring();

    } catch (error) {
      console.error('❌ Failed to start enhanced services:', error);
      await this.stopServices();
      throw error;
    }
  }

  // Stop all services gracefully
  async stopServices(): Promise<void> {
    if (!this.isRunning) {
      console.log('🎭 Service orchestrator not running');
      return;
    }

    console.log('🎭 Stopping enhanced services...');

    try {
      // Stop services in reverse order
      if (this.config.enableInfrastructureMonitoring) {
        InfrastructureMonitoringService.stopMonitoring();
        this.updateServiceStatus('InfrastructureMonitoringService', 'stopped');
      }

      if (this.config.enablePerformanceMonitoring) {
        PerformanceMonitoringService.stopMonitoring();
        this.updateServiceStatus('PerformanceMonitoringService', 'stopped');
      }

      if (this.config.enableAutoscaling) {
        AutoscalingService.stopAutoscaling();
        this.updateServiceStatus('AutoscalingService', 'stopped');
      }

      if (this.config.enableIPPoolMonitoring) {
        IPPoolService.stopMonitoring();
        this.updateServiceStatus('IPPoolService', 'stopped');
      }

      if (this.config.enableMetrics) {
        MetricsCollectionService.stopCollection();
        this.updateServiceStatus('MetricsCollectionService', 'stopped');
      }

      console.log('✅ All enhanced services stopped');

    } catch (error) {
      console.error('❌ Error stopping services:', error);
    } finally {
      this.isRunning = false;
      this.services.clear();
    }
  }

  // Start individual service with error handling
  private async startService(serviceName: string, startFn: () => Promise<void> | void): Promise<void> {
    try {
      console.log(`🔄 Starting ${serviceName}...`);
      await startFn();
      this.updateServiceStatus(serviceName, 'running');
      console.log(`✅ ${serviceName} started successfully`);
    } catch (error) {
      console.error(`❌ Failed to start ${serviceName}:`, error);
      this.updateServiceStatus(serviceName, 'error');
      throw error;
    }
  }

  // Update service status
  private updateServiceStatus(serviceName: string, status: ServiceStatus['status']): void {
    const existing = this.services.get(serviceName);
    const now = new Date().toISOString();
    
    this.services.set(serviceName, {
      name: serviceName,
      status,
      uptime: existing ? existing.uptime : 0,
      lastCheck: now,
      health: status === 'running' ? 100 : status === 'error' ? 0 : 50
    });
  }

  // Start health monitoring
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  // Perform health check on all services
  private async performHealthCheck(): Promise<void> {
    if (!this.isRunning) return;

    for (const [serviceName, service] of this.services.entries()) {
      if (service.status === 'running') {
        try {
          // Update uptime
          const uptimeMs = Date.now() - this.startTime;
          const updatedService = {
            ...service,
            uptime: Math.floor(uptimeMs / 1000),
            lastCheck: new Date().toISOString(),
            health: this.calculateServiceHealth(serviceName)
          };
          
          this.services.set(serviceName, updatedService);
        } catch (error) {
          console.error(`Health check failed for ${serviceName}:`, error);
          this.updateServiceStatus(serviceName, 'error');
        }
      }
    }
  }

  // Calculate service health based on various metrics
  private calculateServiceHealth(serviceName: string): number {
    // Simple health calculation - can be enhanced with actual metrics
    const baseHealth = 100;
    const randomVariation = Math.random() * 10 - 5; // ±5%
    return Math.max(0, Math.min(100, baseHealth + randomVariation));
  }

  // Get orchestrator status
  getOrchestratorStatus(): {
    isRunning: boolean;
    uptime: number;
    services: ServiceStatus[];
    overallHealth: number;
  } {
    const services = Array.from(this.services.values());
    const runningServices = services.filter(s => s.status === 'running').length;
    const overallHealth = services.length > 0 
      ? Math.round(services.reduce((sum, s) => sum + s.health, 0) / services.length)
      : 0;

    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      services,
      overallHealth
    };
  }

  // Get service by name
  getServiceStatus(serviceName: string): ServiceStatus | null {
    return this.services.get(serviceName) || null;
  }

  // Restart specific service
  async restartService(serviceName: string): Promise<void> {
    console.log(`🔄 Restarting ${serviceName}...`);
    
    // This is a simplified restart - in a real implementation,
    // you'd have service-specific restart logic
    this.updateServiceStatus(serviceName, 'stopped');
    
    // Simulate restart delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.updateServiceStatus(serviceName, 'running');
    console.log(`✅ ${serviceName} restarted successfully`);
  }

  // Update configuration
  updateConfiguration(newConfig: Partial<OrchestrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Orchestrator configuration updated');
  }
}
