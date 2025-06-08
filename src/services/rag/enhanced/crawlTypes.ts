
export interface EnhancedCrawlRequest {
  agentId?: string;
  parentSourceId?: string;
  teamId?: string;
  customerId?: string;
  url: string;
  crawlMode?: 'full-website' | 'single-page' | 'sitemap-only';
  maxPages?: number;
  maxDepth?: number;
  excludePaths?: string[];
  includePaths?: string[];
  respectRobots?: boolean;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  priority?: 'normal' | 'high' | 'slow';
  mode?: 'recovery' | 'normal';
}

export interface CrawlStatus {
  parentSourceId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  estimatedTimeRemaining?: number;
  compressionStats?: {
    avgCompressionRatio: number;
    totalContentSize: number;
    spaceSavedGB: number;
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
