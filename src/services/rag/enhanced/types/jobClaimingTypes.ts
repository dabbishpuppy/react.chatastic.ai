
export interface ClaimingStats {
  totalClaims: number;
  successfulClaims: number;
  failedClaims: number;
  conflictedClaims: number;
  avgClaimTime: number;
  conflictRate: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
}

export interface ProcessingOptions {
  maxJobs?: number;
  jobTypes?: string[];
  workerId?: string;
  timeoutMs?: number;
}

export interface ProcessingStats {
  processed: number;
  failed: number;
  conflicts: number;
}
