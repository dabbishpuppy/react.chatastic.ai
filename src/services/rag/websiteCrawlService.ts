
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

  // Enhanced crawling function that removes the 50-link limit
  static async startEnhancedCrawl(
    agentId: string,
    sourceId: string,
    initialUrl: string,
    options: CrawlOptions = {}
  ): Promise<void> {
    const {
      maxDepth = 3,
      maxPages = 1000, // Much higher limit, configurable
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
      const totalEstimate = Math.min(maxPages, 100); // Initial estimate

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

          // Update progress
          const progress = Math.min((processedCount / totalEstimate) * 100, 95);
          await this.updateSourceStatus(sourceId, 'in_progress', progress);

          // Crawl the page
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

            // Process discovered links
            const filteredLinks = this.filterLinks(
              result.links,
              initialUrl,
              includePaths,
              excludePaths
            );

            // Add new links to queue for next depth level
            for (const link of filteredLinks) {
              if (!this.crawledUrls.has(link) && depth + 1 <= maxDepth) {
                this.crawlQueue.push({
                  url: link,
                  depth: depth + 1,
                  parentId: sourceId
                });
              }
            }

            // Update parent source with current stats
            await this.updateParentSourceStats(sourceId, processedCount);
          }

          // Add delay to be respectful
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error crawling ${url}:`, error);
          // Continue with next URL instead of failing entire crawl
        }
      }

      // Mark crawl as completed
      await this.updateSourceStatus(sourceId, 'completed', 100);
      await this.updateParentSourceStats(sourceId, processedCount, new Date().toISOString());

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
          single_page: true // Flag for single page crawling
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

  // Filter links based on include/exclude patterns
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

  // Create child source for crawled page
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
        metadata: { crawled_at: new Date().toISOString() }
      })
      .select()
      .single();

    if (error) throw error;
    return source;
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
