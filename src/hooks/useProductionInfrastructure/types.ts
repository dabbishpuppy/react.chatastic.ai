
export interface ValidatedInfrastructureHealth {
  healthPercentage: number;
  healthy: boolean;
  queueDepth: number;
  activeWorkers: number;
  errorRate: number;
  status?: string;
}

export interface ValidatedSystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  status?: string;
}

export interface ValidatedAutoscalingStatus {
  currentWorkers: number;
  targetWorkers: number;
  scalingActivity: boolean;
  status?: string;
}
