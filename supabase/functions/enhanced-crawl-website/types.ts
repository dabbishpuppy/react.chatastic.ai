
export interface EnhancedCrawlRequest {
  agentId: string;
  url: string;
  crawlMode?: 'full-website' | 'single-page' | 'sitemap-only';
  maxPages?: number;
  excludePaths?: string[];
  includePaths?: string[];
  respectRobots?: boolean;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  priority?: 'normal' | 'high' | 'slow';
}

export interface SourcePageRecord {
  parent_source_id: string;
  customer_id: string;
  url: string;
  status: string;
  priority: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
}

export interface ValidationError {
  url: string;
  errors: string[];
}
