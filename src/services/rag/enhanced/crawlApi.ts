
import { supabase } from "@/integrations/supabase/client";
import { EnhancedCrawlRequest, CrawlStatus } from "./crawlTypes";
import type { AgentSource, SourcePage } from "@/types/database";

// Partial types for selected fields
type SourcePageStatusFields = Pick<SourcePage, 'status'>;

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
      // Use the status-aggregator function with proper error handling
      const { data, error } = await supabase.functions.invoke('status-aggregator', {
        body: { parentSourceId }
      });

      if (error) {
        console.error('Status check error:', error);
        // Fall back to direct database query if aggregator fails
        return await this.fallbackStatusCheck(parentSourceId);
      }

      return data;
    } catch (error: any) {
      console.error('❌ Status check API error:', error);
      // Fall back to direct database query
      return await this.fallbackStatusCheck(parentSourceId);
    }
  }

  private static async fallbackStatusCheck(parentSourceId: string): Promise<CrawlStatus> {
    try {
      console.log('🔄 Using fallback status check for:', parentSourceId);
      
      // Get source info safely
      const { data: source, error: sourceError } = await supabase
        .from<AgentSource>('agent_sources')
        .select('crawl_status, progress, total_jobs, completed_jobs, failed_jobs')
        .eq('id', parentSourceId)
        .maybeSingle();

      if (sourceError) {
        console.error('Source query error:', sourceError);
        throw new Error(`Source query failed: ${sourceError.message}`);
      }

      if (!source) {
        throw new Error('Source not found');
      }

      // Get basic page counts safely
      let pages: SourcePageStatusFields[] = [];
      try {
        const { data: pagesData, error: pagesError } = await supabase
          .from<SourcePage>('source_pages')
          .select('status')
          .eq('parent_source_id', parentSourceId);

        if (pagesError) {
          console.warn('Could not fetch pages for status check:', pagesError);
        } else {
          pages = pagesData || [];
        }
      } catch (error) {
        console.warn('Error fetching pages:', error);
      }

      const pageStats = {
        total: pages.length,
        completed: pages.filter((p: SourcePageStatusFields) => p.status === 'completed').length,
        failed: pages.filter((p: SourcePageStatusFields) => p.status === 'failed').length,
        pending: pages.filter((p: SourcePageStatusFields) => p.status === 'pending').length,
        inProgress: pages.filter((p: SourcePageStatusFields) => p.status === 'in_progress').length
      };

      // Ensure status matches the expected union type
      const normalizeStatus = (status: string | null): "pending" | "in_progress" | "completed" | "failed" => {
        if (!status) return 'pending';
        
        switch (status) {
          case 'completed':
          case 'in_progress':
          case 'failed':
            return status;
          default:
            return 'pending';
        }
      };

      return {
        status: normalizeStatus(source.crawl_status),
        progress: source.progress || 0,
        totalJobs: pageStats.total,
        completedJobs: pageStats.completed,
        failedJobs: pageStats.failed,
        parentSourceId
      };

    } catch (error: any) {
      console.error('❌ Fallback status check failed:', error);
      return {
        status: 'failed',
        progress: 0,
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        parentSourceId
      };
    }
  }

  static async retryFailedJobs(parentSourceId: string): Promise<number> {
    try {
      // Get failed source pages that haven't exceeded retry limit
      const { data: failedPages, error: fetchError } = await supabase
        .from<SourcePage>('source_pages')
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
      const updatePromises = failedPages.map(async (page: Pick<SourcePage, 'id' | 'retry_count'>) => {
        const { error: updateError } = await supabase
          .from<SourcePage>('source_pages')
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

  static async getCrawlJobs(parentSourceId: string): Promise<SourcePage[]> {
    try {
      const { data: pages, error } = await supabase
        .from<SourcePage>('source_pages')
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
}
