
import { supabase } from "@/integrations/supabase/client";

export interface ParentChildStatus {
  parentSourceId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalChildren: number;
  childrenCompleted: number;
  childrenFailed: number;
  childrenPending: number;
  progress: number;
  discoveryCompleted: boolean;
}

export interface ChildJob {
  id: string;
  parentSourceId: string;
  url: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: string;
  retryCount: number;
  contentSize?: number;
  compressionRatio?: number;
  chunksCreated?: number;
  duplicatesFound?: number;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export class ParentChildWorkflowService {
  
  // Start link discovery for a parent source
  static async startLinkDiscovery(params: {
    parentSourceId: string;
    customerId: string;
    url: string;
    excludePaths?: string[];
    includePaths?: string[];
    maxPages?: number;
    priority?: string;
  }) {
    console.log('🔍 Starting link discovery workflow:', params);

    const { data, error } = await supabase.functions.invoke('link-discovery', {
      body: params
    });

    if (error) {
      console.error('❌ Link discovery failed:', error);
      throw new Error(`Link discovery failed: ${error.message}`);
    }

    console.log('✅ Link discovery completed:', data);
    return data;
  }

  // Get parent-child status with real-time capabilities
  static async getParentChildStatus(parentSourceId: string): Promise<ParentChildStatus> {
    const { data: parentSource, error } = await supabase
      .from('agent_sources')
      .select(`
        id,
        crawl_status,
        total_children,
        children_completed,
        children_failed,
        children_pending,
        progress,
        discovery_completed
      `)
      .eq('id', parentSourceId)
      .single();

    if (error) {
      throw new Error(`Failed to get parent status: ${error.message}`);
    }

    return {
      parentSourceId,
      status: (parentSource.crawl_status || 'pending') as 'pending' | 'in_progress' | 'completed' | 'failed',
      totalChildren: parentSource.total_children || 0,
      childrenCompleted: parentSource.children_completed || 0,
      childrenFailed: parentSource.children_failed || 0,
      childrenPending: parentSource.children_pending || 0,
      progress: parentSource.progress || 0,
      discoveryCompleted: parentSource.discovery_completed || false
    };
  }

  // Get child jobs for a parent source
  static async getChildJobs(parentSourceId: string): Promise<ChildJob[]> {
    const { data: childJobs, error } = await supabase
      .from('source_pages')
      .select('*')
      .eq('parent_source_id', parentSourceId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get child jobs: ${error.message}`);
    }

    return (childJobs || []).map(job => ({
      id: job.id,
      parentSourceId: job.parent_source_id,
      url: job.url,
      status: job.status as 'pending' | 'in_progress' | 'completed' | 'failed',
      priority: job.priority || 'normal',
      retryCount: job.retry_count || 0,
      contentSize: job.content_size,
      compressionRatio: job.compression_ratio,
      chunksCreated: job.chunks_created,
      duplicatesFound: job.duplicates_found,
      processingTimeMs: job.processing_time_ms,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at
    }));
  }

  // Subscribe to real-time parent-child status updates
  static subscribeToParentChildUpdates(
    parentSourceId: string,
    onUpdate: (status: ParentChildStatus) => void
  ): () => void {
    console.log(`📡 Setting up real-time subscription for parent: ${parentSourceId}`);

    // Subscribe to parent source changes
    const parentChannel = supabase
      .channel(`parent-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `id=eq.${parentSourceId}`
        },
        async () => {
          try {
            const status = await this.getParentChildStatus(parentSourceId);
            onUpdate(status);
          } catch (error) {
            console.error('Error fetching updated parent status:', error);
          }
        }
      )
      .subscribe();

    // Subscribe to child job changes
    const childChannel = supabase
      .channel(`children-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        async () => {
          try {
            const status = await this.getParentChildStatus(parentSourceId);
            onUpdate(status);
          } catch (error) {
            console.error('Error fetching updated parent status after child change:', error);
          }
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(parentChannel);
      supabase.removeChannel(childChannel);
    };
  }

  // Process a specific child job
  static async processChildJob(childJobId: string) {
    console.log(`🔄 Processing child job: ${childJobId}`);

    const { data, error } = await supabase.functions.invoke('child-job-processor', {
      body: { childJobId }
    });

    if (error) {
      console.error('❌ Child job processing failed:', error);
      throw new Error(`Child job processing failed: ${error.message}`);
    }

    console.log('✅ Child job processed:', data);
    return data;
  }

  // Retry failed child jobs
  static async retryFailedJobs(parentSourceId: string): Promise<number> {
    const { data: failedJobs, error } = await supabase
      .from('source_pages')
      .select('id')
      .eq('parent_source_id', parentSourceId)
      .eq('status', 'failed')
      .lt('retry_count', 3);

    if (error) {
      throw new Error(`Failed to get failed jobs: ${error.message}`);
    }

    let retriedCount = 0;
    for (const job of failedJobs || []) {
      try {
        await this.processChildJob(job.id);
        retriedCount++;
      } catch (error) {
        console.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    return retriedCount;
  }
}
