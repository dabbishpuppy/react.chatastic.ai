
import { supabase } from "@/integrations/supabase/client";
import { CrawlOptions } from "./website/types";
import { EnhancedPageProcessor } from "./website/enhancedPageProcessor";
import { StandardPageProcessor } from "./website/standardPageProcessor";
import { CrawlMetadataManager } from "./website/crawlMetadataManager";

export class WebsiteCrawlService {
  // Enhanced crawling function with advanced compression
  static async startEnhancedCrawl(
    agentId: string,
    sourceId: string,
    initialUrl: string,
    options: CrawlOptions = {}
  ): Promise<void> {
    console.log('🚀 Starting enhanced crawl with advanced compression pipeline');
    
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
      // Update the source metadata with advanced compression settings
      await CrawlMetadataManager.updateSourceCrawlMetadata(sourceId, {
        ...options,
        enableAdvancedCompression: true
      });

      // Call the edge function with advanced compression enabled
      const { data, error } = await supabase.functions.invoke('crawl-website', {
        body: { 
          source_id: sourceId,
          url: initialUrl,
          crawl_type: options.maxDepth === 0 ? 'individual-link' : 'crawl-links',
          max_pages: options.maxPages,
          max_depth: options.maxDepth,
          concurrency: options.concurrency,
          enable_content_pipeline: true,
          enable_advanced_compression: true // New flag for advanced compression
        }
      });

      if (error) {
        console.error('Error calling crawl function:', error);
        throw error;
      }

      console.log('Advanced crawl function response:', data);
    } catch (error) {
      console.error('Failed to start advanced crawl:', error);
      
      // Update source status to failed
      await CrawlMetadataManager.updateSourceStatus(sourceId, 'failed', 0);
      throw error;
    }
  }

  // Enhanced page processing with advanced compression
  static async processPageContentAdvanced(
    sourceId: string,
    agentId: string,
    teamId: string,
    url: string,
    htmlContent: string
  ) {
    return EnhancedPageProcessor.processPageContentAdvanced(
      sourceId,
      agentId,
      teamId,
      url,
      htmlContent
    );
  }

  // Process a single page through the complete content pipeline
  static async processPageContent(
    sourceId: string,
    agentId: string,
    teamId: string,
    url: string,
    htmlContent: string
  ) {
    return StandardPageProcessor.processPageContent(
      sourceId,
      agentId,
      teamId,
      url,
      htmlContent
    );
  }
}
