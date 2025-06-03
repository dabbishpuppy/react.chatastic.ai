
export interface EnhancedCrawlRequest {
  url: string;
  agentId: string;
  crawlMode?: 'single-page' | 'sitemap-only' | 'full-website';
  maxPages?: number;
  maxDepth?: number;
  excludePaths?: string[];
  includePaths?: string[];
  respectRobots?: boolean;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  priority?: 'normal' | 'high' | 'slow';
}

export interface CrawlResult {
  parentSourceId: string;
  totalJobs: number;
  message: string;
}
