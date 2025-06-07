
export interface ParentSource {
  crawl_status: string;
  metadata: any;
  updated_at: string;
}

export interface SourcePage {
  status: string;
  content_size?: number;
  chunks_created?: number;
  duplicates_found?: number;
  compression_ratio?: number;
}

export interface StatusAggregatorResult {
  parentSourceId: string;
  status: string;
  progress: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  inProgressJobs: number;
  compressionStats: CompressionStats;
  totalChildSize: number;
  isRecrawling: boolean;
  debugInfo: any;
  timestamp: string;
}

export interface CompressionStats {
  totalContentSize: number;
  avgCompressionRatio: number;
  totalUniqueChunks: number;
  totalDuplicateChunks: number;
}
