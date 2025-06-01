
import { supabase } from "@/integrations/supabase/client";
import { EnhancedCrawlRequest, CrawlStatus } from "./crawlTypes";

export class CrawlApiService {
  static async initiateCrawl(request: EnhancedCrawlRequest): Promise<{ parentSourceId: string; totalJobs: number }> {
    console.log('🚀 Initiating enhanced crawl:', request);

    const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
      body: request
    });

    if (error) {
      console.error('Enhanced crawl error:', error);
      throw new Error(`Crawl initiation failed: ${error.message}`);
    }

    console.log('✅ Enhanced crawl initiated:', data);
    return {
      parentSourceId: data.parentSourceId,
      totalJobs: data.totalJobs
    };
  }

  static async checkCrawlStatus(parentSourceId: string): Promise<CrawlStatus> {
    const { data, error } = await supabase.functions.invoke('crawl-status-aggregator', {
      body: { parentSourceId }
    });

    if (error) {
      console.error('Status check error:', error);
      throw new Error(`Status check failed: ${error.message}`);
    }

    return data;
  }
}
