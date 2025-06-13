
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobProcessingMetrics {
  processed: number;
  failed: number;
  avgProcessingTime: number;
  queueDepth: number;
  parallelJobs: number;
}

class OptimizedJobProcessor {
  private supabase: any;
  private maxParallelJobs: number;

  constructor(supabase: any, maxParallelJobs: number = 10) {
    this.supabase = supabase;
    this.maxParallelJobs = maxParallelJobs;
  }

  async processJobsParallel(jobs: any[]): Promise<JobProcessingMetrics> {
    console.log(`🚀 Processing ${jobs.length} jobs in parallel...`);
    
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;
    
    // Process jobs in parallel batches
    const results = await Promise.allSettled(
      jobs.map(job => this.processJobSafely(job))
    );
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        processed++;
      } else {
        failed++;
        console.error(`❌ Job failed: ${jobs[index].id}`, result.reason);
        // Schedule retry for failed job
        this.scheduleRetry(jobs[index]);
      }
    });
    
    const processingTime = Date.now() - startTime;
    const avgProcessingTime = processed > 0 ? processingTime / processed : 0;
    
    return {
      processed,
      failed,
      avgProcessingTime,
      queueDepth: jobs.length,
      parallelJobs: Math.min(jobs.length, this.maxParallelJobs)
    };
  }

  private async processJobSafely(job: any): Promise<void> {
    try {
      // Mark job as processing
      await this.supabase
        .from('background_jobs')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString() 
        })
        .eq('id', job.id);

      // Process based on job type
      switch (job.job_type) {
        case 'process_page':
          await this.processPageJob(job);
          break;
        case 'crawl_pages':
          await this.processCrawlJob(job);
          break;
        case 'crawl_batch':
          await this.processCrawlBatchJob(job);
          break;
        case 'train_pages':
          await this.processTrainingJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Mark job as completed
      await this.supabase
        .from('background_jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString() 
        })
        .eq('id', job.id);

    } catch (error) {
      // Mark job as failed
      await this.supabase
        .from('background_jobs')
        .update({ 
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString() 
        })
        .eq('id', job.id);
      
      throw error;
    }
  }

  private async processPageJob(job: any): Promise<void> {
    console.log(`📄 Processing page job ${job.id} for page: ${job.page_id}`);
    
    const { error } = await this.supabase.functions.invoke('child-job-processor', {
      body: {
        childJobId: job.page_id,
        parentSourceId: job.source_id
      }
    });

    if (error) {
      throw new Error(`Page processing failed: ${error.message}`);
    }
  }

  private async processCrawlJob(job: any): Promise<void> {
    console.log(`🕷️ Processing crawl job ${job.id} for source: ${job.source_id}`);
    
    const { error } = await this.supabase.functions.invoke('enhanced-crawl-website', {
      body: {
        sourceId: job.source_id,
        ...job.payload
      }
    });

    if (error) {
      throw new Error(`Crawl processing failed: ${error.message}`);
    }
  }

  private async processCrawlBatchJob(job: any): Promise<void> {
    console.log(`📦 Processing crawl batch job ${job.id} for source: ${job.source_id}`);
    
    const { error } = await this.supabase.functions.invoke('process-source-pages', {
      body: {
        parentSourceId: job.source_id,
        maxConcurrentJobs: job.payload?.maxConcurrentJobs || 5
      }
    });

    if (error) {
      throw new Error(`Batch crawl processing failed: ${error.message}`);
    }
  }

  private async processTrainingJob(job: any): Promise<void> {
    console.log(`🎓 Processing training job ${job.id} for source: ${job.source_id}`);
    
    // Simulate training processing
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async scheduleRetry(job: any): Promise<void> {
    const retryDelay = Math.pow(2, (job.attempts || 0)) * 500; // Exponential backoff
    console.log(`🔄 Scheduling retry for job ${job.id} in ${retryDelay}ms`);
    
    await this.supabase
      .from('background_jobs')
      .update({
        status: 'pending',
        attempts: (job.attempts || 0) + 1,
        scheduled_at: new Date(Date.now() + retryDelay).toISOString()
      })
      .eq('id', job.id);
  }

  async pollAndProcessJobs(maxJobs: number = 50): Promise<JobProcessingMetrics> {
    console.log(`🔍 Polling for pending jobs (max: ${maxJobs})...`);
    
    const { data: jobs, error } = await this.supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(maxJobs);

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return {
        processed: 0,
        failed: 0,
        avgProcessingTime: 0,
        queueDepth: 0,
        parallelJobs: 0
      };
    }

    console.log(`🚀 Processing ${jobs.length} jobs in optimized parallel mode`);
    return await this.processJobsParallel(jobs);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { maxJobs = 50 } = await req.json().catch(() => ({}));
    console.log(`📋 Optimized job processor invoked with maxJobs: ${maxJobs}`);

    const processor = new OptimizedJobProcessor(supabaseClient, 10);
    const metrics = await processor.pollAndProcessJobs(maxJobs);

    console.log(`📊 Processing metrics:`, metrics);

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Workflow job processor error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Job processing failed',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': "application/json" },
        status: 500,
      }
    );
  }
});
