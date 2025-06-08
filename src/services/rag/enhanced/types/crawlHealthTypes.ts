
export interface CrawlHealth {
  healthy: boolean;
  pendingJobs: number;
  stalledJobs: number;
  errorRate: number;
  lastHealthCheck: string;
  autoRecoveryActive: boolean;
  missedJobs: number;
}

export interface CrawlOptions {
  agentId: string;
  teamId: string;
  [key: string]: any;
}

export interface CrawlResult {
  success: boolean;
  parentSourceId?: string;
  error?: string;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
}

export interface SystemStatus {
  crawlService: any;
  healthMonitor: any;
  jobClaiming: any;
  overallHealth: 'healthy' | 'degraded' | 'critical';
}
