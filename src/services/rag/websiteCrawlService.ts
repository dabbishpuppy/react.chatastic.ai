
import { supabase } from "@/integrations/supabase/client";
import { CrawlOptions } from "./website/types";
import { CrawlMetadataManager } from "./website/crawlMetadataManager";

export class WebsiteCrawlService {
  // Enhanced crawling function - only crawls, no content processing
  static async startEnhancedCrawl(
    agentId: string,
    sourceId: string,
    initialUrl: string,
    options: CrawlOptions = {}
  ): Promise<void> {
    console.log('🚀 Starting enhanced crawl (crawl only, no processing)');
    
    // Get team_id for metrics
    const { data: agent } = await supabase
      .from('agents')
      .select('team_id')
      .eq('id', agentId)
      .single();
    
    const teamId = agent?.team_id;
    if (!teamId) {
      throw new Error('Could not determine team ID for agent');
    }

    try {
      // Update the source metadata
      await CrawlMetadataManager.updateSourceCrawlMetadata(sourceId, {
        ...options,
        enableContentProcessing: false // Key change: disable automatic processing
      });

      // Call the edge function with content processing disabled
      const { data, error } = await supabase.functions.invoke('crawl-website', {
        body: { 
          source_id: sourceId,
          url: initialUrl,
          crawl_type: options.maxDepth === 0 ? 'individual-link' : 'crawl-links',
          max_pages: options.maxPages,
          max_depth: options.maxDepth,
          concurrency: options.concurrency,
          enable_content_pipeline: false, // Disable automatic content processing
          enable_advanced_compression: false,
          include_paths: typeof options.includePaths === 'string' ? options.includePaths.split(',') : options.includePaths,
          exclude_paths: typeof options.excludePaths === 'string' ? options.excludePaths.split(',') : options.excludePaths
        }
      });

      if (error) {
        console.error('Error calling crawl function:', error);
        throw error;
      }

      console.log('Crawl function response (crawl only):', data);
    } catch (error) {
      console.error('Failed to start crawl:', error);
      
      // Update source status to failed
      await CrawlMetadataManager.updateSourceStatus(sourceId, 'failed', 0);
      throw error;
    }
  }
}
