
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChildJobRequest {
  childJobId?: string;
  pageId?: string;
  parentSourceId?: string;
  url?: string;
  mode?: 'process' | 'retry' | 'batch';
  batchSize?: number;
}

class EnhancedChildJobProcessor {
  private supabase: any;
  
  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async processRequest(request: ChildJobRequest): Promise<any> {
    console.log('🔄 Processing child job request:', {
      mode: request.mode || 'process',
      childJobId: request.childJobId?.substring(0, 8) + '...',
      pageId: request.pageId?.substring(0, 8) + '...',
      parentSourceId: request.parentSourceId?.substring(0, 8) + '...'
    });

    switch (request.mode) {
      case 'batch':
        return await this.processBatchJobs(request.batchSize || 10);
      case 'retry':
        return await this.retryFailedJobs(request.parentSourceId);
      case 'process':
      default:
        return await this.processSingleJob(request);
    }
  }

  private async processSingleJob(request: ChildJobRequest): Promise<any> {
    // Validate input - accept either childJobId or pageId
    const jobId = request.childJobId || request.pageId;
    if (!jobId) {
      throw new Error('Either childJobId or pageId is required');
    }

    console.log(`🔍 Processing single job: ${jobId}`);

    // Get job details from source_pages table
    const { data: job, error: fetchError } = await this.supabase
      .from('source_pages')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      console.error('❌ Job not found:', fetchError);
      throw new Error(`Job not found: ${jobId}`);
    }

    // Check if job is in a processable state
    if (job.status === 'completed') {
      return {
        success: true,
        message: 'Job already completed',
        jobId: jobId,
        status: 'completed'
      };
    }

    if (job.status === 'in_progress') {
      // Check if job is stalled (started more than 5 minutes ago)
      const startedAt = new Date(job.started_at);
      const now = new Date();
      const timeDiff = now.getTime() - startedAt.getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (timeDiff < fiveMinutes) {
        return {
          success: false,
          message: 'Job is currently being processed',
          jobId: jobId,
          status: 'in_progress'
        };
      }

      console.log('🚨 Job appears stalled, resetting status');
    }

    try {
      // Atomically claim the job
      const { data: claimedJob, error: claimError } = await this.supabase
        .from('source_pages')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          retry_count: (job.retry_count || 0) + 1
        })
        .eq('id', jobId)
        .eq('status', job.status) // Ensure status hasn't changed
        .select()
        .single();

      if (claimError || !claimedJob) {
        console.log('⚠️ Job claim failed, likely claimed by another worker');
        return {
          success: false,
          message: 'Job could not be claimed (race condition)',
          jobId: jobId
        };
      }

      console.log('✅ Job claimed successfully, starting processing');

      // Process the job
      const result = await this.executeJobProcessing(claimedJob);

      return {
        success: true,
        message: 'Job processed successfully',
        jobId: jobId,
        result: result
      };

    } catch (error) {
      console.error('❌ Job processing failed:', error);
      
      // Mark job as failed
      await this.markJobFailed(jobId, error.message);
      
      throw error;
    }
  }

  private async executeJobProcessing(job: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Processing URL: ${job.url}`);

      // Simulate web crawling (replace with actual crawling logic)
      await this.simulateCrawling(job.url);

      // Simulate content processing
      const content = await this.simulateContentExtraction(job.url);
      const contentSize = content.length;
      const compressionRatio = 0.7; // Simulate compression
      const chunksCreated = Math.ceil(content.length / 1000);
      const duplicatesFound = Math.floor(Math.random() * 3);

      const processingTime = Date.now() - startTime;

      // Mark job as completed
      const { error: updateError } = await this.supabase
        .from('source_pages')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          content_size: contentSize,
          compression_ratio: compressionRatio,
          chunks_created: chunksCreated,
          duplicates_found: duplicatesFound,
          processing_time_ms: processingTime,
          error_message: null
        })
        .eq('id', job.id);

      if (updateError) {
        throw new Error(`Failed to update job status: ${updateError.message}`);
      }

      console.log(`✅ Job completed in ${processingTime}ms`);

      return {
        contentSize,
        compressionRatio,
        chunksCreated,
        duplicatesFound,
        processingTime
      };

    } catch (error) {
      console.error('❌ Job execution failed:', error);
      throw error;
    }
  }

  private async simulateCrawling(url: string): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error(`Failed to crawl ${url}: Network timeout`);
    }
  }

  private async simulateContentExtraction(url: string): Promise<string> {
    // Generate realistic content size
    const baseSize = 2000;
    const variableSize = Math.random() * 8000;
    const totalSize = Math.floor(baseSize + variableSize);
    
    return 'x'.repeat(totalSize);
  }

  private async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('source_pages')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: errorMessage
        })
        .eq('id', jobId);

      if (error) {
        console.error('Failed to mark job as failed:', error);
      }
    } catch (error) {
      console.error('Error marking job as failed:', error);
    }
  }

  private async processBatchJobs(batchSize: number): Promise<any> {
    console.log(`📋 Processing batch of ${batchSize} jobs`);

    // Get pending jobs
    const { data: pendingJobs, error } = await this.supabase
      .from('source_pages')
      .select('id, url, parent_source_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (error) {
      throw new Error(`Failed to fetch pending jobs: ${error.message}`);
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return {
        success: true,
        message: 'No pending jobs found',
        processedCount: 0
      };
    }

    console.log(`📋 Found ${pendingJobs.length} pending jobs to process`);

    const results = [];
    let processedCount = 0;
    let failedCount = 0;

    // Process jobs concurrently but with limited concurrency
    const concurrency = 5;
    for (let i = 0; i < pendingJobs.length; i += concurrency) {
      const batch = pendingJobs.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (job) => {
        try {
          const result = await this.processSingleJob({ childJobId: job.id });
          if (result.success) {
            processedCount++;
          } else {
            failedCount++;
          }
          return result;
        } catch (error) {
          failedCount++;
          return {
            success: false,
            jobId: job.id,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid overwhelming the system
      if (i + concurrency < pendingJobs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      success: true,
      message: `Batch processing completed`,
      totalJobs: pendingJobs.length,
      processedCount,
      failedCount,
      results: results.slice(0, 10) // Return first 10 for debugging
    };
  }

  private async retryFailedJobs(parentSourceId?: string): Promise<any> {
    console.log('🔄 Retrying failed jobs', parentSourceId ? `for parent: ${parentSourceId}` : '');

    const query = this.supabase
      .from('source_pages')
      .select('id, url, retry_count, error_message')
      .eq('status', 'failed')
      .lt('retry_count', 3); // Only retry jobs that haven't exceeded retry limit

    if (parentSourceId) {
      query.eq('parent_source_id', parentSourceId);
    }

    const { data: failedJobs, error } = await query.limit(50);

    if (error) {
      throw new Error(`Failed to fetch failed jobs: ${error.message}`);
    }

    if (!failedJobs || failedJobs.length === 0) {
      return {
        success: true,
        message: 'No failed jobs found to retry',
        retriedCount: 0
      };
    }

    console.log(`🔄 Found ${failedJobs.length} failed jobs to retry`);

    // Reset failed jobs to pending status
    const jobIds = failedJobs.map(job => job.id);
    
    const { error: resetError } = await this.supabase
      .from('source_pages')
      .update({
        status: 'pending',
        started_at: null,
        completed_at: null,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .in('id', jobIds);

    if (resetError) {
      throw new Error(`Failed to reset failed jobs: ${resetError.message}`);
    }

    return {
      success: true,
      message: `Reset ${failedJobs.length} failed jobs to pending status`,
      retriedCount: failedJobs.length
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const processor = new EnhancedChildJobProcessor(supabase);

    if (req.method === 'POST') {
      const requestBody = await req.json() as ChildJobRequest;
      
      const result = await processor.processRequest(requestBody);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET') {
      // Health check
      return new Response(JSON.stringify({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405 })

  } catch (error) {
    console.error('Error in child-job-processor:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
