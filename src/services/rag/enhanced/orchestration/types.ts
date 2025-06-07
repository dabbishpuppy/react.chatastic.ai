
export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  health: number; // 0-100
  lastSeen: Date;
  uptime: number;
  errorCount: number;
  metadata?: Record<string, any>;
}

export interface OrchestrationConfig {
  enableMetrics: boolean;
  enableAlerting: boolean;
  enablePerformanceMonitoring: boolean;
  enableInfrastructureMonitoring: boolean;
  enableIPPoolMonitoring: boolean;
  enableEgressManagement: boolean;
  enableAutoscaling: boolean;
  enableWorkerQueue: boolean;
  enableConnectionPooling: boolean;
  enableDatabaseOptimization: boolean;
  maxRetries: number;
  healthCheckInterval: number;
  alertThresholds: {
    cpu: number;
    memory: number;
    errorRate: number;
  };
}

export interface SystemHealth {
  overall: number;
  services: ServiceStatus[];
  alerts: number;
  uptime: number;
}
