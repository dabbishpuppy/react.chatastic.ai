import { supabase } from "@/integrations/supabase/client";
import { EnhancedCrawlRequest, CrawlStatus } from "./crawlTypes";

export class CrawlApiService {
  static async initiateCrawl(request: EnhancedCrawlRequest): Promise<{ parentSourceId: string; totalJobs: number }> {
    console.log('🚀 Initiating enhanced crawl:', request);

    try {
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: request
      });

      if (error) {
        console.error('Enhanced crawl error:', error);
        throw new Error(`Crawl initiation failed: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('Enhanced crawl failed:', data);
        throw new Error(data?.error || 'Unknown error occurred during crawl initiation');
      }

      console.log('✅ Enhanced crawl initiated:', data);
      return {
        parentSourceId: data.parentSourceId,
        totalJobs: data.totalJobs
      };
    } catch (error: any) {
      console.error('❌ Enhanced crawl API error:', error);
      // Re-throw with more context
      throw new Error(`Enhanced crawl failed: ${error.message || 'Unknown error'}`);
    }
  }

  static async checkCrawlStatus(parentSourceId: string): Promise<CrawlStatus> {
    try {
      const { data, error } = await supabase.functions.invoke('crawl-status-aggregator', {
        body: { parentSourceId }
      });

      if (error) {
        console.error('Status check error:', error);
        throw new Error(`Status check failed: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('❌ Status check API error:', error);
      throw new Error(`Status check failed: ${error.message || 'Unknown error'}`);
    }
  }

  static async retryFailedJobs(parentSourceId: string): Promise<number> {
    try {
      // Get failed source pages that haven't exceeded retry limit
      const { data: failedPages, error: fetchError } = await supabase
        .from('source_pages')
        .select('id, retry_count')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'failed')
        .lt('retry_count', 3);

      if (fetchError) {
        console.error('Error fetching failed pages:', fetchError);
        throw new Error(`Failed to fetch failed pages: ${fetchError.message}`);
      }

      if (!failedPages || failedPages.length === 0) {
        return 0;
      }

      // Update each failed page to pending status with incremented retry count
      const updatePromises = failedPages.map(async (page: any) => {
        const { error: updateError } = await supabase
          .from('source_pages')
          .update({
            status: 'pending',
            retry_count: (page.retry_count || 0) + 1,
            error_message: null,
            started_at: null,
            completed_at: null
          })
          .eq('id', page.id);

        if (updateError) {
          console.error(`Error updating page ${page.id}:`, updateError);
        }
        
        return !updateError;
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(success => success).length;

      console.log(`✅ Retried ${successCount}/${failedPages.length} failed jobs`);
      return successCount;
    } catch (error: any) {
      console.error('❌ Retry failed jobs error:', error);
      throw new Error(`Failed to retry jobs: ${error.message || 'Unknown error'}`);
    }
  }

  static async getCrawlJobs(parentSourceId: string) {
    try {
      const { data: pages, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('parent_source_id', parentSourceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching source pages:', error);
        throw new Error(`Failed to fetch source pages: ${error.message}`);
      }

      return pages || [];
    } catch (error: any) {
      console.error('❌ Get crawl jobs error:', error);
      throw new Error(`Failed to get crawl jobs: ${error.message || 'Unknown error'}`);
    }
  }

  static async startChunking(parentSourceId: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('🚀 Starting chunking for parent source:', parentSourceId);

      const { data, error } = await supabase.functions.invoke('generate-missing-chunks', {
        body: { parentSourceId }
      });

      if (error) {
        console.error('Chunking error:', error);
        throw new Error(`Chunking failed: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('Chunking failed:', data);
        throw new Error(data?.error || 'Unknown error occurred during chunking');
      }

      console.log('✅ Chunking initiated successfully:', data);
      return {
        success: true,
        message: data.message || 'Chunking started successfully'
      };

    } catch (error: any) {
      console.error('❌ Chunking API error:', error);
      throw new Error(`Chunking failed: ${error.message || 'Unknown error'}`);
    }
  }
}
