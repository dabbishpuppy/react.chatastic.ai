
import { supabase } from "@/integrations/supabase/client";
import { AgentSource } from "@/types/rag";

interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  includePaths?: string;
  excludePaths?: string;
  respectRobots?: boolean;
}

export class WebsiteCrawlService {
  // Enhanced crawling function that calls the edge function
  static async startEnhancedCrawl(
    agentId: string,
    sourceId: string,
    initialUrl: string,
    options: CrawlOptions = {}
  ): Promise<void> {
    console.log('🚀 Starting enhanced crawl via edge function');
    
    try {
      // Call the edge function to handle the crawling
      const { data, error } = await supabase.functions.invoke('crawl-website', {
        body: { 
          source_id: sourceId,
          url: initialUrl,
          crawl_type: options.maxDepth === 0 ? 'individual-link' : 'crawl-links'
        }
      });

      if (error) {
        console.error('Error calling crawl function:', error);
        throw error;
      }

      console.log('Crawl function response:', data);
    } catch (error) {
      console.error('Failed to start crawl:', error);
      
      // Update source status to failed
      await this.updateSourceStatus(sourceId, 'failed', 0);
      throw error;
    }
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
}
