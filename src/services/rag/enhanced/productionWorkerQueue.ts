
import { supabase } from "@/integrations/supabase/client";

interface JobBatch {
  id: string;
  jobs: any[];
  priority: number;
  estimatedTime: number;
}

export class ProductionWorkerQueue {
  private static isRunning = false;
  private static processInterval: number | null = null;
  private static readonly BATCH_SIZE = 50;
  private static readonly PROCESS_INTERVAL = 5000; // 5 seconds
  private static readonly MAX_CONCURRENT_BATCHES = 4;

  static async startQueueProcessor(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 Production queue processor already running');
      return;
    }

    console.log('🚀 Starting production worker queue processor...');
    this.isRunning = true;

    // Process jobs immediately
    this.processJobBatches();

    // Set up interval processing
    this.processInterval = window.setInterval(() => {
      this.processJobBatches();
    }, this.PROCESS_INTERVAL);
  }

  static stopQueueProcessor(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Stopped production queue processor');
  }

  private static async processJobBatches(): Promise<void> {
    try {
      // Get pending jobs grouped by parent source
      const { data: pendingJobs, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(this.BATCH_SIZE * this.MAX_CONCURRENT_BATCHES);

      if (error || !pendingJobs || pendingJobs.length === 0) {
        return;
      }

      // Group jobs by parent source for batch processing
      const jobsByParent = this.groupJobsByParent(pendingJobs);
      
      // Process batches concurrently
      const batchPromises = Object.entries(jobsByParent)
        .slice(0, this.MAX_CONCURRENT_BATCHES)
        .map(([parentId, jobs]) => this.processBatch(parentId, jobs));

      await Promise.allSettled(batchPromises);

    } catch (error) {
      console.error('❌ Error processing job batches:', error);
    }
  }

  private static groupJobsByParent(jobs: any[]): Record<string, any[]> {
    return jobs.reduce((groups, job) => {
      const parentId = job.parent_source_id;
      if (!groups[parentId]) {
        groups[parentId] = [];
      }
      groups[parentId].push(job);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private static async processBatch(parentSourceId: string, jobs: any[]): Promise<void> {
    console.log(`🔄 Processing batch of ${jobs.length} jobs for parent: ${parentSourceId}`);

    try {
      // Mark jobs as in_progress with incremented retry count
      const jobIds = jobs.map(job => job.id);
      
      // First increment retry count for each job individually
      const updatePromises = jobIds.map(async (jobId) => {
        const job = jobs.find(j => j.id === jobId);
        const newRetryCount = (job?.retry_count || 0) + 1;
        
        return supabase
          .from('source_pages')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
            retry_count: newRetryCount
          })
          .eq('id', jobId);
      });

      const updateResults = await Promise.all(updatePromises);
      const updateErrors = updateResults.filter(result => result.error);
      
      if (updateErrors.length > 0) {
        console.error('❌ Error updating job status:', updateErrors);
        return;
      }

      // Trigger processing for this batch
      const { error: processError } = await supabase.functions.invoke('process-source-pages', {
        body: { 
          parentSourceId,
          jobIds,
          batchMode: true,
          highPriority: jobs.some(job => job.priority === 'high')
        }
      });

      if (processError && !processError.message?.includes('409')) {
        console.error('❌ Error triggering batch processing:', processError);
        
        // Reset jobs to pending on error
        await supabase
          .from('source_pages')
          .update({
            status: 'pending',
            started_at: null
          })
          .in('id', jobIds);
      } else {
        console.log(`✅ Batch processing triggered for ${jobs.length} jobs`);
      }

    } catch (error) {
      console.error(`❌ Error processing batch for ${parentSourceId}:`, error);
    }
  }

  static async getQueueStatus(): Promise<{
    pendingJobs: number;
    inProgressJobs: number;
    completedJobs: number;
    failedJobs: number;
    estimatedProcessingTime: number;
  }> {
    try {
      const { data: stats, error } = await supabase
        .from('source_pages')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error || !stats) {
        return {
          pendingJobs: 0,
          inProgressJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          estimatedProcessingTime: 0
        };
      }

      const pendingJobs = stats.filter(s => s.status === 'pending').length;
      const inProgressJobs = stats.filter(s => s.status === 'in_progress').length;
      const completedJobs = stats.filter(s => s.status === 'completed').length;
      const failedJobs = stats.filter(s => s.status === 'failed').length;

      // Estimate processing time based on current throughput
      const estimatedProcessingTime = Math.ceil(pendingJobs / (this.BATCH_SIZE * this.MAX_CONCURRENT_BATCHES)) * (this.PROCESS_INTERVAL / 1000);

      return {
        pendingJobs,
        inProgressJobs,
        completedJobs,
        failedJobs,
        estimatedProcessingTime
      };

    } catch (error) {
      console.error('❌ Error getting queue status:', error);
      return {
        pendingJobs: 0,
        inProgressJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        estimatedProcessingTime: 0
      };
    }
  }

  static async getQueueMetrics(): Promise<{
    queueDepth: number;
    totalPending: number;
    totalInProgress: number;
    totalCompleted: number;
    totalFailed: number;
    workerUtilization: number;
    averageProcessingTime: number;
  }> {
    try {
      const queueStatus = await this.getQueueStatus();
      
      // Calculate additional metrics
      const totalJobs = queueStatus.pendingJobs + queueStatus.inProgressJobs + queueStatus.completedJobs + queueStatus.failedJobs;
      const workerUtilization = totalJobs > 0 ? queueStatus.inProgressJobs / this.MAX_CONCURRENT_BATCHES : 0;
      const averageProcessingTime = this.PROCESS_INTERVAL; // Simplified metric

      return {
        queueDepth: queueStatus.pendingJobs,
        totalPending: queueStatus.pendingJobs,
        totalInProgress: queueStatus.inProgressJobs,
        totalCompleted: queueStatus.completedJobs,
        totalFailed: queueStatus.failedJobs,
        workerUtilization,
        averageProcessingTime
      };

    } catch (error) {
      console.error('❌ Error getting queue metrics:', error);
      return {
        queueDepth: 0,
        totalPending: 0,
        totalInProgress: 0,
        totalCompleted: 0,
        totalFailed: 0,
        workerUtilization: 0,
        averageProcessingTime: 0
      };
    }
  }

  static async getHealthStatus(): Promise<{ healthy: boolean; details: any }> {
    try {
      const queueStatus = await this.getQueueStatus();
      
      // System is healthy if:
      // 1. Queue processor is running
      // 2. Not too many failed jobs
      // 3. Jobs are being processed (not stuck)
      const failureRate = queueStatus.failedJobs / (queueStatus.completedJobs + queueStatus.failedJobs || 1);
      const healthy = this.isRunning && failureRate < 0.1 && queueStatus.estimatedProcessingTime < 300; // 5 minutes max

      return {
        healthy,
        details: {
          ...queueStatus,
          isRunning: this.isRunning,
          failureRate: Math.round(failureRate * 100),
          queueDepth: queueStatus.pendingJobs,
          activeWorkers: this.MAX_CONCURRENT_BATCHES,
          errorRate: failureRate
        }
      };

    } catch (error) {
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}
