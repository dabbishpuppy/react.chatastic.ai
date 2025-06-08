
export interface HealthReport {
  healthy: boolean;
  issues: string[];
  actions: string[];
  orphanedPages: number;
  stalledJobs: number;
  missingJobs: number;
  queueStatus: string;
  timestamp: string;
}

export interface OrphanedPage {
  id: string;
  parent_source_id: string;
  url: string;
  created_at: string;
}

export interface StalledJob {
  id: string;
  page_id: string;
  started_at: string;
}

export interface StalledPage {
  id: string;
  parent_source_id: string;
  url: string;
}
