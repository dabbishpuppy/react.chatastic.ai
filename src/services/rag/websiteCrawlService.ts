
import { supabase } from "@/integrations/supabase/client";
import { AgentSource } from "@/types/rag";

interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  includePaths?: string;
  excludePaths?: string;
  respectRobots?: boolean;
}

interface CrawlResult {
  url: string;
  title?: string;
  content?: string;
  links: string[];
  depth: number;
}

export class WebsiteCrawlService {
  private static crawledUrls = new Set<string>();
  private static crawlQueue: { url: string; depth: number; parentId: string }[] = [];
  private static isCrawling = false;

  // Enhanced crawling function that removes limits and implements continuous crawling
  static async startEnhancedCrawl(
    agentId: string,
    sourceId: string,
    initialUrl: string,
    options: CrawlOptions = {}
  ): Promise<void> {
    const {
      maxDepth = 5, // Increased depth for more comprehensive crawling
      maxPages = 10000, // Much higher limit for extensive crawling
      includePaths = '',
      excludePaths = '',
      respectRobots = true
    } = options;

    // Initialize crawl state
    this.crawledUrls.clear();
    this.crawlQueue = [{ url: initialUrl, depth: 0, parentId: sourceId }];
    this.isCrawling = true;

    try {
      // Update source status to crawling
      await this.updateSourceStatus(sourceId, 'in_progress', 0);

      let processedCount = 0;
      let discoveredLinksCount = 0;

      // Continuous crawling loop
      while (this.crawlQueue.length > 0 && processedCount < maxPages && this.isCrawling) {
        const currentItem = this.crawlQueue.shift()!;
        const { url, depth, parentId } = currentItem;

        // Skip if already crawled or depth exceeded
        if (this.crawledUrls.has(url) || depth > maxDepth) {
          continue;
        }

        try {
          // Mark as crawled
          this.crawledUrls.add(url);
          processedCount++;

          // Update progress dynamically based on discovered links
          const totalEstimate = Math.max(discoveredLinksCount, processedCount + this.crawlQueue.length);
          const progress = Math.min((processedCount / Math.max(totalEstimate, 10)) * 90, 90);
          await this.updateSourceStatus(sourceId, 'in_progress', progress);

          // Crawl the page and discover new links
          const result = await this.crawlSinglePage(url);
          
          if (result) {
            // Create child source for this page
            const childSource = await this.createChildSource(
              agentId,
              parentId,
              result.url,
              result.title,
              result.content
            );

            // Process and filter discovered links
            const filteredLinks = this.filterLinks(
              result.links,
              initialUrl,
              includePaths,
              excludePaths
            );

            // Add new unique links to queue for next depth level
            for (const link of filteredLinks) {
              if (!this.crawledUrls.has(link) && depth + 1 <= maxDepth) {
                // Check if link is already in queue to avoid duplicates
                const isInQueue = this.crawlQueue.some(item => item.url === link);
                if (!isInQueue) {
                  this.crawlQueue.push({
                    url: link,
                    depth: depth + 1,
                    parentId: sourceId
                  });
                  discoveredLinksCount++;
                }
              }
            }

            // Update parent source with current stats
            await this.updateParentSourceStats(sourceId, processedCount);

            // Log progress
            console.log(`Crawled ${processedCount} pages, ${this.crawlQueue.length} in queue, discovered ${discoveredLinksCount} total links`);
          }

          // Respectful delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`Error crawling ${url}:`, error);
          // Continue with next URL instead of failing entire crawl
        }
      }

      // Mark crawl as completed
      await this.updateSourceStatus(sourceId, 'completed', 100);
      await this.updateParentSourceStats(sourceId, processedCount, new Date().toISOString());

      console.log(`Crawl completed: ${processedCount} pages processed, ${discoveredLinksCount} links discovered`);

    } catch (error) {
      console.error('Crawl failed:', error);
      await this.updateSourceStatus(sourceId, 'failed', 0);
    } finally {
      this.isCrawling = false;
    }
  }

  // Stop current crawl
  static stopCrawl(): void {
    this.isCrawling = false;
  }

  // Crawl a single page and extract content and links
  private static async crawlSinglePage(url: string): Promise<CrawlResult | null> {
    try {
      // Call the Supabase edge function for crawling
      const { data, error } = await supabase.functions.invoke('crawl-website', {
        body: { 
          url,
          single_page: true
        }
      });

      if (error) throw error;

      return {
        url: data.url,
        title: data.title,
        content: data.content,
        links: data.links || [],
        depth: 0
      };
    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error);
      return null;
    }
  }

  // Enhanced link filtering with better domain and pattern matching
  private static filterLinks(
    links: string[],
    baseUrl: string,
    includePaths: string,
    excludePaths: string
  ): string[] {
    const baseDomain = new URL(baseUrl).hostname;
    
    return links.filter(link => {
      try {
        const linkUrl = new URL(link);
        
        // Only crawl same domain
        if (linkUrl.hostname !== baseDomain) return false;
        
        // Skip common non-content file types
        const pathname = linkUrl.pathname.toLowerCase();
        const excludedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js', '.json', '.xml'];
        if (excludedExtensions.some(ext => pathname.endsWith(ext))) return false;
        
        // Apply include patterns
        if (includePaths) {
          const includePatterns = includePaths.split('\n').filter(p => p.trim());
          if (!includePatterns.some(pattern => link.includes(pattern.trim()))) {
            return false;
          }
        }
        
        // Apply exclude patterns
        if (excludePaths) {
          const excludePatterns = excludePaths.split('\n').filter(p => p.trim());
          if (excludePatterns.some(pattern => link.includes(pattern.trim()))) {
            return false;
          }
        }
        
        return true;
      } catch {
        return false;
      }
    });
  }

  // Create child source for crawled page with proper type handling
  private static async createChildSource(
    agentId: string,
    parentSourceId: string,
    url: string,
    title?: string,
    content?: string
  ): Promise<AgentSource> {
    // Get team_id from parent source
    const { data: parentSource, error: parentError } = await supabase
      .from('agent_sources')
      .select('team_id')
      .eq('id', parentSourceId)
      .single();

    if (parentError) throw parentError;

    const { data: source, error } = await supabase
      .from('agent_sources')
      .insert({
        agent_id: agentId,
        team_id: parentSource.team_id,
        parent_source_id: parentSourceId,
        source_type: 'website',
        title: title || url,
        url,
        content,
        crawl_status: 'completed',
        metadata: { 
          crawled_at: new Date().toISOString(),
          parent_url: url
        }
      })
      .select()
      .single();

    if (error) throw error;
    
    // Properly handle the metadata type conversion
    return {
      ...source,
      metadata: source.metadata as Record<string, any> || {}
    } as AgentSource;
  }

  // Update source crawl status and progress
  private static async updateSourceStatus(
    sourceId: string,
    status: string,
    progress: number
  ): Promise<void> {
    const { error } = await supabase
      .from('agent_sources')
      .update({
        crawl_status: status,
        progress
      })
      .eq('id', sourceId);

    if (error) throw error;
  }

  // Update parent source with crawl statistics
  private static async updateParentSourceStats(
    sourceId: string,
    linksCount: number,
    lastCrawledAt?: string
  ): Promise<void> {
    const updates: any = {
      links_count: linksCount
    };

    if (lastCrawledAt) {
      updates.last_crawled_at = lastCrawledAt;
    }

    const { error } = await supabase
      .from('agent_sources')
      .update(updates)
      .eq('id', sourceId);

    if (error) throw error;
  }
}
