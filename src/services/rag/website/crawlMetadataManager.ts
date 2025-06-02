
import { supabase } from "@/integrations/supabase/client";
import { CrawlOptions } from "./types";

export class CrawlMetadataManager {
  // Update source metadata with crawl parameters
  static async updateSourceCrawlMetadata(
    sourceId: string,
    options: CrawlOptions & { enableAdvancedCompression?: boolean }
  ): Promise<void> {
    const { data: currentSource, error: fetchError } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();

    if (fetchError) throw fetchError;

    // Safely handle metadata by ensuring it's always an object
    const existingMetadata = currentSource.metadata as Record<string, any> || {};
    
    const updatedMetadata = {
      ...existingMetadata,
      max_pages: options.maxPages || 100,
      max_depth: options.maxDepth || 3,
      concurrency: options.concurrency || 2,
      last_progress_update: new Date().toISOString(),
      content_pipeline_enabled: true,
      advanced_compression_enabled: options.enableAdvancedCompression || false
    };

    console.log(`🎯 Updating source metadata with advanced compression: ${options.enableAdvancedCompression}`);

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
  static async updateSourceStatus(
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
