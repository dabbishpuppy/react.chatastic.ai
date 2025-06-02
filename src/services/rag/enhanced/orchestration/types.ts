
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
