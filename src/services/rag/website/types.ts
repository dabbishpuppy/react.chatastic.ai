
export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  includePaths?: string | string[];
  excludePaths?: string | string[];
  respectRobots?: boolean;
  concurrency?: number;
  enableAdvancedCompression?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  error?: string;
  metrics?: {
    extractionTime: number;
    cleaningTime: number;
    chunkingTime: number;
    compressionRatio: number;
    chunksCreated: number;
    duplicatesFound: number;
    processingMode: string;
    compressionMethod: string;
    spaceSaved: number;
  };
}

export interface ContentSummary {
  summary: string;
  keywords: string[];
}
