
import { WebSocketRealtimeService } from '@/services/workflow/WebSocketRealtimeService';

export interface ProgressEvent {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  metadata?: {
    batchId?: string;
    domain?: string;
    workerId?: string;
    currentUrl?: string;
    completedPages?: number;
    totalPages?: number;
    results?: any[];
    error?: any;
    [key: string]: any;
  };
}

export class CrawlProgressPublisher {
  constructor(private sourceId: string) {}

  /**
   * Publish progress event via WebSocket
   */
  async publishProgress(event: ProgressEvent): Promise<void> {
    try {
      const progressEvent = {
        topic: `crawl_progress_${this.sourceId}`,
        type: 'CRAWL_PROGRESS' as const,
        sourceId: this.sourceId,
        status: event.status,
        progress: event.progress,
        metadata: {
          message: event.message,
          timestamp: new Date().toISOString(),
          ...event.metadata
        }
      };

      console.log(`📡 Publishing progress for source ${this.sourceId}:`, {
        status: event.status,
        progress: event.progress,
        message: event.message
      });

      // Emit to WebSocket subscribers
      window.dispatchEvent(new CustomEvent('crawlProgress', {
        detail: progressEvent
      }));

      // Also store in database for persistence
      await this.persistProgressEvent(progressEvent);

    } catch (error) {
      console.error('❌ Failed to publish progress event:', error);
    }
  }

  /**
   * Publish crawl started event
   */
  async publishStarted(totalPages: number, metadata?: any): Promise<void> {
    await this.publishProgress({
      status: 'processing',
      progress: 0,
      message: `Crawl started for ${totalPages} pages`,
      metadata: {
        totalPages,
        startedAt: new Date().toISOString(),
        ...metadata
      }
    });
  }

  /**
   * Publish crawl completed event
   */
  async publishCompleted(successCount: number, totalCount: number, metadata?: any): Promise<void> {
    await this.publishProgress({
      status: 'completed',
      progress: 100,
      message: `Crawl completed: ${successCount}/${totalCount} pages successful`,
      metadata: {
        successCount,
        totalCount,
        completedAt: new Date().toISOString(),
        ...metadata
      }
    });
  }

  /**
   * Publish crawl failed event
   */
  async publishFailed(error: string, metadata?: any): Promise<void> {
    await this.publishProgress({
      status: 'failed',
      progress: 0,
      message: `Crawl failed: ${error}`,
      metadata: {
        error,
        failedAt: new Date().toISOString(),
        ...metadata
      }
    });
  }

  /**
   * Publish batch progress event
   */
  async publishBatchProgress(
    batchNumber: number, 
    totalBatches: number, 
    batchProgress: number,
    metadata?: any
  ): Promise<void> {
    const overallProgress = ((batchNumber - 1) / totalBatches) * 100 + (batchProgress / totalBatches);
    
    await this.publishProgress({
      status: 'processing',
      progress: Math.min(overallProgress, 100),
      message: `Processing batch ${batchNumber}/${totalBatches} (${Math.round(batchProgress)}% complete)`,
      metadata: {
        batchNumber,
        totalBatches,
        batchProgress,
        ...metadata
      }
    });
  }

  /**
   * Persist progress event to database for history/recovery
   */
  private async persistProgressEvent(event: any): Promise<void> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { error } = await supabase
        .from('crawl_progress_events')
        .insert({
          source_id: this.sourceId,
          event_type: event.type,
          status: event.status,
          progress: event.progress,
          metadata: event.metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Failed to persist progress event:', error);
      }

    } catch (error) {
      console.error('❌ Error persisting progress event:', error);
    }
  }

  /**
   * Get progress history for a source
   */
  static async getProgressHistory(sourceId: string, limit: number = 50): Promise<any[]> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase
        .from('crawl_progress_events')
        .select('*')
        .eq('source_id', sourceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to get progress history:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('❌ Error getting progress history:', error);
      return [];
    }
  }
}
