
export interface EnhancedCrawlRequest {
  agentId: string;
  url: string;
  crawlMode?: string;
  maxPages?: number;
  excludePaths?: string[];
  includePaths?: string[];
  respectRobots?: boolean;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  priority?: string;
  discoverOnly?: boolean;
  parentSourceId?: string;
  mode?: string; // Added mode parameter for recrawl operations
}

export function validateRequest(requestBody: any): EnhancedCrawlRequest {
  const {
    agentId,
    url,
    crawlMode = 'full-website',
    maxPages = 100,
    excludePaths = [],
    includePaths = [],
    respectRobots = true,
    enableCompression = true,
    enableDeduplication = true,
    priority = 'normal',
    discoverOnly = false,
    parentSourceId,
    mode
  } = requestBody;

  console.log('🔧 Crawl settings:', { crawlMode, maxPages, excludePaths, includePaths, discoverOnly, parentSourceId, mode });

  // Validate required fields
  if (!agentId || !url) {
    throw new Error('Missing required fields: agentId and url');
  }

  // Validate input parameters early to catch type issues
  if (typeof agentId !== 'string') {
    throw new Error(`agentId must be a string, got ${typeof agentId}`);
  }
  if (typeof url !== 'string') {
    throw new Error(`url must be a string, got ${typeof url}`);
  }

  // CRITICAL: Ensure priority is always a string, never boolean
  const safePriority = String(priority || 'normal');
  if (!['normal', 'high', 'slow'].includes(safePriority)) {
    throw new Error(`priority must be one of: normal, high, slow, got ${safePriority}`);
  }

  console.log('🔍 Input type validation passed:', {
    agentId: `${typeof agentId} (${agentId})`,
    url: `${typeof url} (${url})`,
    priority: `${typeof safePriority} (${safePriority})`,
    mode: mode ? `${typeof mode} (${mode})` : 'not provided'
  });

  return {
    agentId,
    url,
    crawlMode,
    maxPages,
    excludePaths,
    includePaths,
    respectRobots,
    enableCompression,
    enableDeduplication,
    priority: safePriority,
    discoverOnly,
    parentSourceId,
    mode
  };
}
