
import { supabase } from "@/integrations/supabase/client";

export interface CrawlJob {
  id: string;
  parentSourceId: string;
  customerId: string;
  url: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'normal' | 'high' | 'slow';
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export class WorkerQueueService {
  private static readonly MAX_CONCURRENT_JOBS_PER_CUSTOMER = 100;
  private static readonly DEFAULT_MAX_RETRIES = 3;

  // Enqueue a batch of crawl jobs
  static async enqueueJobs(
    parentSourceId: string,
    customerId: string,
    urls: string[],
    priority: 'normal' | 'high' | 'slow' = 'normal'
  ): Promise<string[]> {
    console.log(`📋 Enqueuing ${urls.length} jobs for customer ${customerId}`);

    // Check customer concurrency limits
    const { count: activeJobs } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .in('status', ['pending', 'in_progress']);

    if ((activeJobs || 0) + urls.length > this.MAX_CONCURRENT_JOBS_PER_CUSTOMER) {
      throw new Error(`Customer exceeds concurrent job limit (${this.MAX_CONCURRENT_JOBS_PER_CUSTOMER})`);
    }

    const jobs = urls.map(url => ({
      parent_source_id: parentSourceId,
      customer_id: customerId,
      url,
      status: 'pending' as const,
      priority,
      retry_count: 0,
      max_retries: this.DEFAULT_MAX_RETRIES
    }));

    const { data: createdJobs, error } = await supabase
      .from('crawl_jobs')
      .insert(jobs)
      .select('id');

    if (error) {
      throw new Error(`Failed to enqueue jobs: ${error.message}`);
    }

    const jobIds = createdJobs?.map(job => job.id) || [];
    
    // Publish job-spawned events for workers to pick up
    await this.publishJobEvents(jobIds, 'job-spawned', priority);

    return jobIds;
  }

  // Get next available job for a worker (simplified version)
  static async getNextJob(workerId: string): Promise<CrawlJob | null> {
    // Get the next pending job with priority ordering
    const { data: jobs, error } = await supabase
      .from('crawl_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (error || !jobs || jobs.length === 0) {
      return null;
    }

    const job = jobs[0];

    // Update job to in_progress
    const { error: updateError } = await supabase
      .from('crawl_jobs')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Failed to update job status:', updateError);
      return null;
    }

    return {
      id: job.id,
      parentSourceId: job.parent_source_id,
      customerId: job.customer_id,
      url: job.url,
      status: 'in_progress',
      priority: job.priority as CrawlJob['priority'],
      retryCount: job.retry_count,
      maxRetries: job.max_retries || this.DEFAULT_MAX_RETRIES,
      createdAt: job.created_at,
      startedAt: new Date().toISOString()
    };
  }

  // Update job status
  static async updateJobStatus(
    jobId: string,
    status: CrawlJob['status'],
    updates: {
      errorMessage?: string;
      startedAt?: string;
      completedAt?: string;
      processingTimeMs?: number;
      contentSize?: number;
      compressionRatio?: number;
      chunksCreated?: number;
      duplicatesFound?: number;
    } = {}
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
      ...updates
    };

    if (status === 'in_progress' && !updates.startedAt) {
      updateData.started_at = new Date().toISOString();
    }

    if (['completed', 'failed'].includes(status) && !updates.completedAt) {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('crawl_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error(`Failed to update job ${jobId}:`, error);
      throw new Error(`Failed to update job status: ${error.message}`);
    }

    // Publish status update event
    await this.publishJobEvents([jobId], 'job-status-updated', 'normal');
  }

  // Retry failed jobs
  static async retryFailedJobs(parentSourceId: string): Promise<number> {
    const { data: failedJobs } = await supabase
      .from('crawl_jobs')
      .select('id, retry_count, max_retries')
      .eq('parent_source_id', parentSourceId)
      .eq('status', 'failed')
      .lt('retry_count', 'max_retries');

    if (!failedJobs || failedJobs.length === 0) {
      return 0;
    }

    const jobIds = failedJobs.map(job => job.id);
    
    const { error } = await supabase
      .from('crawl_jobs')
      .update({
        status: 'pending',
        error_message: null,
        started_at: null,
        completed_at: null,
        updated_at: new Date().toISOString()
      })
      .in('id', jobIds);

    if (error) {
      throw new Error(`Failed to retry jobs: ${error.message}`);
    }

    // Increment retry count for each job
    for (const job of failedJobs) {
      await supabase
        .from('crawl_jobs')
        .update({ retry_count: job.retry_count + 1 })
        .eq('id', job.id);
    }

    // Publish retry events
    await this.publishJobEvents(jobIds, 'job-retried', 'high');

    return jobIds.length;
  }

  // Get job metrics for a parent source
  static async getJobMetrics(parentSourceId: string) {
    const { data: jobs } = await supabase
      .from('crawl_jobs')
      .select('*')
      .eq('parent_source_id', parentSourceId);

    if (!jobs) return null;

    const metrics = {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      inProgressJobs: jobs.filter(j => j.status === 'in_progress').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      avgProcessingTime: 0,
      totalContentSize: 0,
      avgCompressionRatio: 0,
      totalChunksCreated: 0,
      totalDuplicatesFound: 0
    };

    const completedJobs = jobs.filter(j => j.status === 'completed');
    if (completedJobs.length > 0) {
      metrics.avgProcessingTime = completedJobs.reduce((sum, j) => sum + (j.processing_time_ms || 0), 0) / completedJobs.length;
      metrics.totalContentSize = completedJobs.reduce((sum, j) => sum + (j.content_size || 0), 0);
      metrics.avgCompressionRatio = completedJobs.reduce((sum, j) => sum + (j.compression_ratio || 0), 0) / completedJobs.length;
      metrics.totalChunksCreated = completedJobs.reduce((sum, j) => sum + (j.chunks_created || 0), 0);
      metrics.totalDuplicatesFound = completedJobs.reduce((sum, j) => sum + (j.duplicates_found || 0), 0);
    }

    return metrics;
  }

  // Publish job events via Supabase realtime
  private static async publishJobEvents(
    jobIds: string[],
    eventType: string,
    priority: string
  ): Promise<void> {
    try {
      // Using Supabase channel to publish events
      const channel = supabase.channel('crawl-worker-queue');
      
      for (const jobId of jobIds) {
        await channel.send({
          type: 'broadcast',
          event: eventType,
          payload: { jobId, priority, timestamp: new Date().toISOString() }
        });
      }
    } catch (error) {
      console.error('Failed to publish job events:', error);
      // Don't throw - job publishing failure shouldn't block job creation
    }
  }

  // Health check for queue status
  static async getQueueHealth(): Promise<{
    totalPendingJobs: number;
    oldestPendingJob: string | null;
    averageProcessingTime: number;
    failureRate: number;
  }> {
    const { count: pendingJobs } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { data: oldestPending } = await supabase
      .from('crawl_jobs')
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const { data: recentJobs } = await supabase
      .from('crawl_jobs')
      .select('status, processing_time_ms')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .in('status', ['completed', 'failed']);

    let averageProcessingTime = 0;
    let failureRate = 0;

    if (recentJobs && recentJobs.length > 0) {
      const completedJobs = recentJobs.filter(j => j.status === 'completed');
      const failedJobs = recentJobs.filter(j => j.status === 'failed');
      
      averageProcessingTime = completedJobs.reduce((sum, j) => sum + (j.processing_time_ms || 0), 0) / completedJobs.length;
      failureRate = failedJobs.length / recentJobs.length;
    }

    return {
      totalPendingJobs: pendingJobs || 0,
      oldestPendingJob: oldestPending?.created_at || null,
      averageProcessingTime,
      failureRate
    };
  }
}
