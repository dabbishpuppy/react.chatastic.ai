
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
}
