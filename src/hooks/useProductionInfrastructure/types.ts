
export interface ValidatedInfrastructureHealth {
  healthPercentage: number;
  healthy: boolean;
  queueDepth: number;
  activeWorkers: number;
  errorRate: number;
  status?: string;
  rateLimiting?: {
    activeCustomers: number;
    avgUsagePercent: number;
    throttledRequests: number;
  };
  connectionPools?: {
    healthScore: number;
    activeConnections: number;
    queuedRequests: number;
  };
  partitioning?: {
    healthScore: number;
    balancedTables: number;
    hotSpots: number;
  };
}

export interface ValidatedSystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  status?: string;
  services?: Array<{
    name: string;
    healthy: boolean;
  }>;
  throughput?: number;
  errorRate?: number;
  alerts?: Array<{
    message: string;
    severity: string;
  }>;
}

export interface ValidatedAutoscalingStatus {
  currentWorkers: number;
  targetWorkers: number;
  scalingActivity: boolean;
  status?: string;
}
