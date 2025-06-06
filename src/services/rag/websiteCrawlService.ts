
import { supabase } from "@/integrations/supabase/client";
import { CrawlOptions } from "./website/types";
import { CrawlMetadataManager } from "./website/crawlMetadataManager";

export class WebsiteCrawlService {
  // Enhanced crawling function with proper status management
  static async startEnhancedCrawl(
    agentId: string,
    sourceId: string,
    initialUrl: string,
    options: CrawlOptions = {}
  ): Promise<void> {
    console.log('🚀 Starting enhanced crawl with status management');
    
    try {
      // Update status to 'in_progress' when crawl actually starts
      await this.updateSourceStatus(sourceId, 'in_progress', 0, {
        status_history: [{
          status: 'in_progress',
          timestamp: new Date().toISOString(),
          message: 'Crawl started, discovering pages'
        }]
      });

      // Get team_id for the crawl
      const { data: agent } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', agentId)
        .single();
      
      if (!agent?.team_id) {
        throw new Error('Could not determine team ID for agent');
      }

      // Update source metadata with crawl parameters (without status)
      await CrawlMetadataManager.updateSourceCrawlMetadata(sourceId, {
        ...options
      });

      // Call the enhanced crawl edge function
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: { 
          agentId: agentId,
          url: initialUrl,
          crawlMode: options.maxDepth === 0 ? 'single-page' : 'full-website',
          maxPages: options.maxPages || 50,
          maxDepth: options.maxDepth || 3,
          concurrency: options.concurrency || 2,
          includePaths: options.includePaths || [],
          excludePaths: options.excludePaths || [],
          respectRobots: true,
          enableCompression: true,
          enableDeduplication: true,
          priority: 'normal'
        }
      });

      if (error) {
        console.error('❌ Error calling enhanced crawl function:', error);
        
        // Update status to failed on error
        await this.updateSourceStatus(sourceId, 'failed', 0, {
          error_message: error.message,
          status_history: [{
            status: 'failed',
            timestamp: new Date().toISOString(),
            message: `Crawl failed: ${error.message}`
          }]
        });
        
        throw error;
      }

      console.log('✅ Enhanced crawl initiated successfully:', data);
      
    } catch (error) {
      console.error('❌ Failed to start crawl:', error);
      
      // Update source status to failed
      await this.updateSourceStatus(sourceId, 'failed', 0, {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        status_history: [{
          status: 'failed',
          timestamp: new Date().toISOString(),
          message: `Crawl setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      });
      
      throw error;
    }
  }

  // Helper method to update source status
  private static async updateSourceStatus(
    sourceId: string, 
    status: string, 
    progress: number, 
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    console.log(`📊 Updating source ${sourceId} status to: ${status} (${progress}%)`);
    
    const { error } = await supabase
      .from('agent_sources')
      .update({
        crawl_status: status,
        progress: progress,
        updated_at: new Date().toISOString(),
        ...additionalData
      })
      .eq('id', sourceId);

    if (error) {
      console.error('❌ Error updating source status:', error);
      throw error;
    }
  }

  // Method to update source to "Ready for Training" status
  static async markSourceReadyForTraining(sourceId: string): Promise<void> {
    console.log(`🎓 Marking source ${sourceId} as ready for training`);
    
    await this.updateSourceStatus(sourceId, 'crawled', 100, {
      status_history: [{
        status: 'crawled',
        timestamp: new Date().toISOString(),
        message: 'All pages crawled successfully, ready for training'
      }]
    });
  }

  // Method to start training process
  static async startTraining(sourceId: string): Promise<void> {
    console.log(`🧠 Starting training for source ${sourceId}`);
    
    await this.updateSourceStatus(sourceId, 'training', 100, {
      status_history: [{
        status: 'training',
        timestamp: new Date().toISOString(),
        message: 'Training started, processing content for AI'
      }]
    });

    // Call training edge function
    const { error } = await supabase.functions.invoke('process-crawled-pages', {
      body: { parentSourceId: sourceId }
    });

    if (error) {
      await this.updateSourceStatus(sourceId, 'failed', 100, {
        error_message: error.message,
        status_history: [{
          status: 'failed',
          timestamp: new Date().toISOString(),
          message: `Training failed: ${error.message}`
        }]
      });
      throw error;
    }
  }

  // Method to mark training as completed
  static async markTrainingCompleted(sourceId: string): Promise<void> {
    console.log(`✅ Training completed for source ${sourceId}`);
    
    await this.updateSourceStatus(sourceId, 'trained', 100, {
      status_history: [{
        status: 'trained',
        timestamp: new Date().toISOString(),
        message: 'Training completed successfully, agent updated'
      }]
    });

    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('trainingCompleted', { 
      detail: { sourceId } 
    }));
  }
}
