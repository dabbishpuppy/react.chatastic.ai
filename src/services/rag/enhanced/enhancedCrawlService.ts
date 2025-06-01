import { supabase } from "@/integrations/supabase/client";
import { WorkerQueueService } from "./workerQueue";
import { RateLimitingService } from "./rateLimiting";
import { CrawlWorkerService } from "./crawlWorker";

export interface EnhancedCrawlRequest {
  agentId: string;
  url: string;
  maxPages?: number;
  excludePaths?: string[];
  includePaths?: string[];
  respectRobots?: boolean;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  priority?: 'normal' | 'high' | 'slow';
  crawlMode?: 'single-page' | 'sitemap-only' | 'full-website';
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

export class EnhancedCrawlService {
  // Initialize worker if not running
  static async ensureWorkerRunning(): Promise<void> {
    const status = CrawlWorkerService.getWorkerStatus();
    if (!status.isRunning) {
      console.log('🚀 Starting background crawl worker...');
      // Start worker in background
      CrawlWorkerService.startWorker().catch(console.error);
    }
  }

  // Initiate a new crawl with worker queue
  static async initiateCrawl(request: EnhancedCrawlRequest): Promise<{
    parentSourceId: string;
    totalJobs: number;
  }> {
    console.log('🚀 Enhanced crawl service initiating crawl:', request);

    try {
      // Validate required fields
      if (!request.agentId || !request.url) {
        throw new Error('Missing required fields: agentId and url are required');
      }

      // Get customer ID from agent
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', request.agentId)
        .single();

      if (agentError || !agent) {
        console.error('Agent lookup error:', agentError);
        throw new Error(`Agent not found: ${agentError?.message || 'Unknown error'}`);
      }

      const customerId = agent.team_id;
      const crawlMode = request.crawlMode || 'full-website';
      const maxPages = request.maxPages || 100;

      console.log('✅ Agent found, team_id:', customerId);

      // Discover URLs based on crawl mode
      let discoveredUrls: string[] = [];
      
      try {
        switch (crawlMode) {
          case 'single-page':
            discoveredUrls = [request.url];
            break;
          case 'sitemap-only':
            discoveredUrls = await this.discoverSitemapLinks(request.url);
            break;
          case 'full-website':
          default:
            discoveredUrls = await this.discoverLinks(
              request.url, 
              request.excludePaths, 
              request.includePaths,
              maxPages
            );
            break;
        }
      } catch (discoveryError: any) {
        console.error('URL discovery error:', discoveryError);
        // Fallback to single URL if discovery fails
        discoveredUrls = [request.url];
      }

      console.log(`📊 Discovery completed: ${discoveredUrls.length} URLs found`);
      
      // Check rate limits and quotas
      let rateLimitCheck;
      try {
        rateLimitCheck = await RateLimitingService.canStartCrawl(customerId, discoveredUrls.length);
      } catch (rateLimitError: any) {
        console.error('Rate limiting check error:', rateLimitError);
        // Use default quota if rate limiting service fails
        rateLimitCheck = {
          allowed: true,
          quota: { concurrentJobs: 5 }
        };
      }

      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
      }

      // Create parent source
      const parentSourceData = {
        agent_id: request.agentId,
        team_id: customerId,
        source_type: 'website' as const,
        title: request.url,
        url: request.url,
        crawl_status: 'pending' as const,
        exclude_paths: request.excludePaths || [],
        include_paths: request.includePaths || [],
        respect_robots: request.respectRobots ?? true,
        max_concurrent_jobs: rateLimitCheck.quota?.concurrentJobs || 5,
        progress: 0,
        total_jobs: discoveredUrls.length,
        metadata: {
          crawl_initiated_at: new Date().toISOString(),
          enhanced_pipeline: true,
          worker_queue_enabled: true,
          priority: request.priority || 'normal',
          crawlMode: crawlMode,
          maxPages: maxPages,
          enableCompression: request.enableCompression ?? true,
          enableDeduplication: request.enableDeduplication ?? true
        }
      };

      const { data: parentSource, error: sourceError } = await supabase
        .from('agent_sources')
        .insert(parentSourceData)
        .select()
        .single();

      if (sourceError) {
        console.error('Parent source creation error:', sourceError);
        throw new Error(`Failed to create parent source: ${sourceError.message}`);
      }

      console.log('✅ Parent source created:', parentSource.id);

      // Create source_pages instead of crawl_jobs
      const sourcePages = discoveredUrls.map((discoveredUrl) => ({
        parent_source_id: parentSource.id,
        customer_id: customerId,
        url: discoveredUrl,
        status: 'pending' as const,
        priority: request.priority || 'normal',
        created_at: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3
      }));

      // Insert source pages in smaller batches to avoid RLS issues
      const batchSize = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < sourcePages.length; i += batchSize) {
        const batch = sourcePages.slice(i, i + batchSize);
        
        const { data: batchResult, error: batchError } = await supabase
          .from('source_pages')
          .insert(batch)
          .select('id');

        if (batchError) {
          console.error(`Batch insertion failed for batch ${Math.floor(i/batchSize) + 1}:`, batchError);
          // Continue with other batches instead of failing completely
        } else {
          insertedCount += batchResult?.length || 0;
        }
      }

      console.log(`✅ Inserted ${insertedCount}/${sourcePages.length} source pages`);

      // Update parent source to in_progress
      const currentMetadata = parentSource.metadata as Record<string, any> || {};
      const updatedMetadata = {
        ...currentMetadata,
        jobs_enqueued_at: new Date().toISOString(),
        inserted_pages: insertedCount
      };

      await supabase
        .from('agent_sources')
        .update({
          crawl_status: 'in_progress',
          discovery_completed: true,
          total_children: insertedCount,
          metadata: updatedMetadata
        })
        .eq('id', parentSource.id);

      // Ensure worker is running
      await this.ensureWorkerRunning();

      console.log(`✅ Enhanced crawl initiated: ${insertedCount} source pages created`);

      return {
        parentSourceId: parentSource.id,
        totalJobs: insertedCount
      };
    } catch (error: any) {
      console.error('❌ Enhanced crawl service error:', error);
      throw new Error(`Enhanced crawl failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Check crawl status with enhanced metrics
  static async checkCrawlStatus(parentSourceId: string): Promise<CrawlStatus> {
    // Get source pages instead of crawl jobs
    const { data: pages, error } = await supabase
      .from('source_pages')
      .select('*')
      .eq('parent_source_id', parentSourceId);

    if (error) {
      throw new Error(`Failed to fetch source pages: ${error.message}`);
    }

    const totalJobs = pages?.length || 0;
    const completedJobs = pages?.filter(p => p.status === 'completed').length || 0;
    const failedJobs = pages?.filter(p => p.status === 'failed').length || 0;
    const inProgressJobs = pages?.filter(p => p.status === 'in_progress').length || 0;

    const progress = totalJobs > 0 
      ? Math.round(((completedJobs + failedJobs) / totalJobs) * 100)
      : 0;

    let status: CrawlStatus['status'] = 'pending';
    if (completedJobs + failedJobs === totalJobs && totalJobs > 0) {
      status = 'completed';
    } else if (inProgressJobs > 0 || completedJobs > 0) {
      status = 'in_progress';
    }

    // Calculate compression stats
    const completedPages = pages?.filter(p => p.status === 'completed') || [];
    const avgCompressionRatio = completedPages.length > 0
      ? completedPages.reduce((sum, p) => sum + (p.compression_ratio || 0), 0) / completedPages.length
      : 0;
    const totalContentSize = completedPages.reduce((sum, p) => sum + (p.content_size || 0), 0);

    return {
      parentSourceId,
      status,
      progress,
      totalJobs,
      completedJobs,
      failedJobs,
      compressionStats: avgCompressionRatio > 0 ? {
        avgCompressionRatio,
        totalContentSize,
        spaceSavedGB: (totalContentSize * (1 - avgCompressionRatio)) / (1024 * 1024 * 1024)
      } : undefined
    };
  }

  // Subscribe to crawl updates using Supabase realtime
  static subscribeToCrawlUpdates(
    parentSourceId: string,
    onUpdate: (status: CrawlStatus) => void
  ): () => void {
    console.log(`📡 Setting up enhanced real-time subscription for ${parentSourceId}`);

    const channel = supabase
      .channel(`enhanced-crawl-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crawl_jobs',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        async () => {
          try {
            const status = await this.checkCrawlStatus(parentSourceId);
            onUpdate(status);
          } catch (error) {
            console.error('Error fetching updated status:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Retry failed jobs
  static async retryFailedJobs(parentSourceId: string): Promise<number> {
    return await WorkerQueueService.retryFailedJobs(parentSourceId);
  }

  // Get all crawl jobs for a parent source
  static async getCrawlJobs(parentSourceId: string) {
    const { data: jobs, error } = await supabase
      .from('crawl_jobs')
      .select('*')
      .eq('parent_source_id', parentSourceId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch crawl jobs: ${error.message}`);
    }

    return jobs || [];
  }

  // Discover links (simplified version - full implementation would be in edge function)
  private static async discoverLinks(
    url: string,
    excludePaths: string[] = [],
    includePaths: string[] = [],
    maxPages: number = 100
  ): Promise<string[]> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return [url]; // Fallback to just the main URL
      }

      const html = await response.text();
      const linkPattern = /href\s*=\s*["']([^"']+)["']/gi;
      const discovered = new Set<string>([url]); // Always include the main URL

      let match;
      while ((match = linkPattern.exec(html)) !== null) {
        try {
          const linkUrl = new URL(match[1], url);
          
          // Only include same-domain links
          if (linkUrl.hostname === new URL(url).hostname) {
            const fullUrl = linkUrl.href;
            const path = linkUrl.pathname;
            
            // Apply filters
            if (this.shouldExcludePath(path, excludePaths)) continue;
            if (includePaths.length > 0 && !this.shouldIncludePath(path, includePaths)) continue;
            
            discovered.add(fullUrl);
            
            // Limit discovery to prevent runaway crawls
            if (discovered.size >= maxPages) break;
          }
        } catch (e) {
          continue; // Invalid URL, skip
        }
      }

      return Array.from(discovered);
    } catch (error) {
      console.error('Error discovering links:', error);
      return [url]; // Fallback to just the main URL
    }
  }

  // New method to discover sitemap links
  private static async discoverSitemapLinks(sitemapUrl: string): Promise<string[]> {
    try {
      console.log('🗺️ Discovering links from sitemap:', sitemapUrl);
      
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
        },
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.status}`);
      }

      const xmlText = await response.text();
      const urls = this.parseSitemapXml(xmlText);
      
      console.log(`✅ Discovered ${urls.length} URLs from sitemap`);
      return urls;
      
    } catch (error) {
      console.error('Error discovering sitemap links:', error);
      // Fallback to just the sitemap URL itself
      return [sitemapUrl];
    }
  }

  // Parse sitemap XML to extract URLs
  private static parseSitemapXml(xmlText: string): string[] {
    const urls: string[] = [];
    
    try {
      // Simple regex-based XML parsing (for production, consider using a proper XML parser)
      const locRegex = /<loc>(.*?)<\/loc>/g;
      let match;
      
      while ((match = locRegex.exec(xmlText)) !== null) {
        const url = match[1].trim();
        if (url && url.startsWith('http')) {
          urls.push(url);
        }
      }
      
      // If no URLs found, try sitemapindex format
      if (urls.length === 0) {
        const sitemapRegex = /<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g;
        while ((match = sitemapRegex.exec(xmlText)) !== null) {
          const sitemapUrl = match[1].trim();
          if (sitemapUrl && sitemapUrl.startsWith('http')) {
            // For now, just add the sitemap URL itself
            // In production, you might want to recursively fetch sub-sitemaps
            urls.push(sitemapUrl);
          }
        }
      }
      
    } catch (error) {
      console.error('Error parsing sitemap XML:', error);
    }
    
    return urls;
  }

  private static shouldExcludePath(path: string, excludePaths: string[]): boolean {
    const defaultExcludes = [
      '/wp-json/*', '/wp-admin/*', '/xmlrpc.php', '/checkout/*', 
      '/cart/*', '/admin/*', '/api/*', '*.json', '*.xml', '*.rss'
    ];
    
    const allExcludes = [...defaultExcludes, ...excludePaths];
    
    return allExcludes.some(pattern => {
      if (pattern.endsWith('*')) {
        return path.startsWith(pattern.slice(0, -1));
      }
      return path === pattern;
    });
  }

  private static shouldIncludePath(path: string, includePaths: string[]): boolean {
    return includePaths.some(pattern => {
      if (pattern.endsWith('*')) {
        return path.startsWith(pattern.slice(0, -1));
      }
      return path === pattern;
    });
  }
}
