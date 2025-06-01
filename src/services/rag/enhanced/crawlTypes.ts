
export interface EnhancedCrawlRequest {
  agentId: string;
  url: string;
  excludePaths?: string[];
  includePaths?: string[];
  respectRobots?: boolean;
  maxConcurrentJobs?: number;
}

export interface CrawlStatus {
  parentSourceId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  compressionStats?: {
    totalContentSize: number;
    avgCompressionRatio: number;
    totalUniqueChunks: number;
    totalDuplicateChunks: number;
  };
}

export interface CompressionStats {
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalUniqueChunks: number;
  totalDuplicateChunks: number;
  avgCompressionRatio: number;
  spaceSavedBytes: number;
  spaceSavedPercentage: number;
}
