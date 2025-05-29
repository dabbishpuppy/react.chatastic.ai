
import { supabase } from "@/integrations/supabase/client";
import { AgentSource } from "@/types/rag";

interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  includePaths?: string;
  excludePaths?: string;
  respectRobots?: boolean;
  concurrency?: number;
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
      // Update the source metadata with the new crawl parameters before starting
      await this.updateSourceCrawlMetadata(sourceId, options);

      // Call the edge function to handle the crawling
      const { data, error } = await supabase.functions.invoke('crawl-website', {
        body: { 
          source_id: sourceId,
          url: initialUrl,
          crawl_type: options.maxDepth === 0 ? 'individual-link' : 'crawl-links',
          max_pages: options.maxPages,
          max_depth: options.maxDepth,
          concurrency: options.concurrency
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

  // Update source metadata with crawl parameters
  private static async updateSourceCrawlMetadata(
    sourceId: string,
    options: CrawlOptions
  ): Promise<void> {
    const { data: currentSource, error: fetchError } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (fetchError) throw fetchError;

    const updatedMetadata = {
      ...(currentSource.metadata || {}),
      max_pages: options.maxPages || 100,
      max_depth: options.maxDepth || 3,
      concurrency: options.concurrency || 2,
      last_progress_update: new Date().toISOString()
    };

    const { error } = await supabase
      .from('agent_sources')
      .update({
        metadata: updatedMetadata,
        crawl_status: 'pending',
        progress: 0,
        links_count: 0
      })
      .eq('id', sourceId);

    if (error) throw error;
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
