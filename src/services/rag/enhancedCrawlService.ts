
import { supabase } from "@/integrations/supabase/client";

export interface EnhancedCrawlRequest {
  agentId: string;
  url: string;
  excludePaths?: string[];
  includePaths?: string[];
  respectRobots?: boolean;
  maxConcurrentJobs?: number;
}

export interface CrawlStatus {
  parentSourceId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  compressionStats?: {
    totalContentSize: number;
    avgCompressionRatio: number;
    totalUniqueChunks: number;
    totalDuplicateChunks: number;
  };
}

export class EnhancedCrawlService {
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

  static async getCrawlJobs(parentSourceId: string) {
    // Try the RPC function first, with fallback to direct query
    try {
      const { data, error } = await supabase.rpc('get_crawl_jobs_for_source', {
        parent_source_id: parentSourceId
      });

      if (error) {
        console.warn('RPC function not available, using fallback query:', error);
        // Fallback to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('crawl_jobs')
          .select('*')
          .eq('parent_source_id', parentSourceId)
          .order('created_at', { ascending: true });

        if (fallbackError) {
          throw fallbackError;
        }
        return fallbackData || [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching crawl jobs:', error);
      return [];
    }
  }

  static async retryFailedJobs(parentSourceId: string): Promise<number> {
    try {
      const { data: failedJobs, error: fetchError } = await supabase
        .from('crawl_jobs')
        .select('id')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'failed')
        .lt('retry_count', 3);

      if (fetchError) {
        throw fetchError;
      }

      if (!failedJobs || failedJobs.length === 0) {
        return 0;
      }

      const { error: updateError } = await supabase
        .from('crawl_jobs')
        .update({
          status: 'pending',
          retry_count: supabase.rpc('increment', { x: 1 }), // Use increment function
          error_message: null,
          started_at: null,
          completed_at: null
        })
        .in('id', failedJobs.map(job => job.id));

      if (updateError) {
        throw updateError;
      }

      return failedJobs.length;
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
      return 0;
    }
  }

  // Simplified real-time subscription with better error handling
  static subscribeToCrawlUpdates(
    parentSourceId: string,
    onUpdate: (status: CrawlStatus) => void
  ) {
    console.log(`📡 Setting up real-time subscription for ${parentSourceId}`);

    try {
      // Subscribe to crawl_jobs changes
      const jobsChannel = supabase
        .channel(`crawl-jobs-${parentSourceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crawl_jobs',
            filter: `parent_source_id=eq.${parentSourceId}`
          },
          async (payload) => {
            console.log('📡 Crawl job update:', payload);
            
            // Fetch updated status with error handling
            try {
              const status = await this.checkCrawlStatus(parentSourceId);
              onUpdate(status);
            } catch (error) {
              console.error('Error fetching updated status:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);
        });

      // Subscribe to agent_sources changes for parent status
      const sourceChannel = supabase
        .channel(`agent-source-${parentSourceId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agent_sources',
            filter: `id=eq.${parentSourceId}`
          },
          async (payload) => {
            console.log('📡 Parent source update:', payload);
            
            try {
              const status = await this.checkCrawlStatus(parentSourceId);
              onUpdate(status);
            } catch (error) {
              console.error('Error fetching updated status:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Source subscription status:', status);
        });

      return () => {
        supabase.removeChannel(jobsChannel);
        supabase.removeChannel(sourceChannel);
      };
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      return () => {}; // Return empty cleanup function
    }
  }

  static async getCompressionStats(customerId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_sources')
        .select(`
          total_content_size,
          compressed_content_size,
          unique_chunks,
          duplicate_chunks,
          global_compression_ratio
        `)
        .eq('customer_id', customerId)
        .eq('source_type', 'website');

      if (error) {
        console.error('Error fetching compression stats:', error);
        // Return default stats if there's an error
        return {
          totalOriginalSize: 0,
          totalCompressedSize: 0,
          totalUniqueChunks: 0,
          totalDuplicateChunks: 0,
          avgCompressionRatio: 0,
          spaceSavedBytes: 0,
          spaceSavedPercentage: 0
        };
      }

      const sources = data || [];
      const totalOriginalSize = sources.reduce((sum, source: any) => sum + (source.total_content_size || 0), 0);
      const totalCompressedSize = sources.reduce((sum, source: any) => sum + (source.compressed_content_size || 0), 0);
      const totalUniqueChunks = sources.reduce((sum, source: any) => sum + (source.unique_chunks || 0), 0);
      const totalDuplicateChunks = sources.reduce((sum, source: any) => sum + (source.duplicate_chunks || 0), 0);
      const avgCompressionRatio = sources.length 
        ? sources.reduce((sum, source: any) => sum + (source.global_compression_ratio || 0), 0) / sources.length 
        : 0;

      return {
        totalOriginalSize,
        totalCompressedSize,
        totalUniqueChunks,
        totalDuplicateChunks,
        avgCompressionRatio,
        spaceSavedBytes: totalOriginalSize - totalCompressedSize,
        spaceSavedPercentage: totalOriginalSize > 0 ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 : 0
      };
    } catch (error) {
      console.error('Error in getCompressionStats:', error);
      return {
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        totalUniqueChunks: 0,
        totalDuplicateChunks: 0,
        avgCompressionRatio: 0,
        spaceSavedBytes: 0,
        spaceSavedPercentage: 0
      };
    }
  }
}
