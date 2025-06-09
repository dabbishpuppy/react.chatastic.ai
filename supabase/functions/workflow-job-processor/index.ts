
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackgroundJob {
  id: string;
  job_type: string;
  source_id: string;
  page_id?: string;
  payload: any;
  attempts: number;
  max_attempts: number;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduled_at: string;
}

interface JobMetrics {
  processed: number;
  failed: number;
  avgProcessingTime: number;
  queueDepth: number;
}

class EnhancedJobProcessor {
  private supabase: any;
  private metrics: JobMetrics = {
    processed: 0,
    failed: 0,
    avgProcessingTime: 0,
    queueDepth: 0
  };

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async processJob(job: BackgroundJob): Promise<void> {
    const startTime = Date.now();
    console.log(`🔄 Processing job: ${job.job_type} for source: ${job.source_id}`);

    try {
      await this.updateJobStatus(job.id, 'processing');
      await this.broadcastEvent({
        topic: `source:${job.source_id}`,
        type: 'STATUS_CHANGED',
        sourceId: job.source_id,
        status: 'processing',
        metadata: { jobId: job.id, jobType: job.job_type }
      });

      switch (job.job_type) {
        case 'crawl_pages':
          await this.handleCrawlPages(job);
          break;
        case 'train_pages':
          await this.handleTrainPages(job);
          break;
        case 'process_page':
          await this.handleProcessPage(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      await this.updateJobStatus(job.id, 'completed');
      
      const processingTime = Date.now() - startTime;
      this.updateMetrics(true, processingTime);
      
      console.log(`✅ Job completed: ${job.id} in ${processingTime}ms`);

    } catch (error) {
      console.error(`❌ Job failed: ${job.id}`, error);
      
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, processingTime);
      
      await this.handleJobFailure(job, error.message);
    }
  }

  private async handleCrawlPages(job: BackgroundJob): Promise<void> {
    const { source_id, config } = job.payload;
    
    console.log(`🕷️ Starting crawl for source: ${source_id}`);
    
    // Transition source to CRAWLING status
    await this.supabase.rpc('transition_source_status', {
      p_source_id: source_id,
      p_new_status: 'CRAWLING',
      p_event_type: 'CRAWL_STARTED',
      p_metadata: { job_id: job.id, config }
    });

    await this.broadcastEvent({
      topic: `source:${source_id}`,
      type: 'STATUS_CHANGED',
      sourceId: source_id,
      status: 'CRAWLING'
    });

    // Simulate crawl process with progress updates
    for (let i = 1; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await this.broadcastEvent({
        topic: `source:${source_id}`,
        type: 'CRAWL_PROGRESS',
        sourceId: source_id,
        progress: i * 10,
        metadata: { step: `Processing batch ${i}/10` }
      });
    }

    // Complete crawl
    await this.supabase.rpc('transition_source_status', {
      p_source_id: source_id,
      p_new_status: 'COMPLETED',
      p_event_type: 'CRAWL_COMPLETED',
      p_metadata: { job_id: job.id, completed_at: new Date().toISOString() }
    });

    await this.broadcastEvent({
      topic: `source:${source_id}`,
      type: 'SOURCE_COMPLETED',
      sourceId: source_id,
      status: 'COMPLETED'
    });
  }

  private async handleTrainPages(job: BackgroundJob): Promise<void> {
    const { source_id } = job.payload;
    
    console.log(`🎓 Starting training for source: ${source_id}`);
    
    await this.supabase.rpc('transition_source_status', {
      p_source_id: source_id,
      p_new_status: 'TRAINING',
      p_event_type: 'TRAINING_STARTED',
      p_metadata: { job_id: job.id }
    });

    await this.broadcastEvent({
      topic: `source:${source_id}`,
      type: 'STATUS_CHANGED',
      sourceId: source_id,
      status: 'TRAINING'
    });

    // Simulate training with progress
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      await this.broadcastEvent({
        topic: `source:${source_id}`,
        type: 'CRAWL_PROGRESS',
        sourceId: source_id,
        progress: i * 20,
        metadata: { step: `Training phase ${i}/5` }
      });
    }

    await this.supabase.rpc('transition_source_status', {
      p_source_id: source_id,
      p_new_status: 'TRAINED',
      p_event_type: 'TRAINING_COMPLETED',
      p_metadata: { job_id: job.id, completed_at: new Date().toISOString() }
    });

    await this.broadcastEvent({
      topic: `source:${source_id}`,
      type: 'SOURCE_COMPLETED',
      sourceId: source_id,
      status: 'TRAINED'
    });
  }

  private async handleProcessPage(job: BackgroundJob): Promise<void> {
    const { page_id, source_id, url } = job.payload;
    
    console.log(`📄 Processing page: ${url} (${page_id})`);
    
    // Call the existing page processor function
    const { data, error } = await this.supabase.functions.invoke('process-source-pages', {
      body: {
        pageId: page_id,
        parentSourceId: source_id,
        url: url
      }
    });

    if (error) {
      throw new Error(`Page processing failed: ${error.message}`);
    }

    console.log(`✅ Page processed successfully: ${page_id}`);
    
    await this.broadcastEvent({
      topic: `source:${source_id}`,
      type: 'PAGE_COMPLETED',
      sourceId: source_id,
      pageId: page_id,
      status: 'completed'
    });
  }

  private async handleJobFailure(job: BackgroundJob, errorMessage: string): Promise<void> {
    if (job.attempts < job.max_attempts) {
      // Calculate exponential backoff delay
      const retryDelay = Math.pow(2, job.attempts) * 1000;
      const scheduledAt = new Date(Date.now() + retryDelay).toISOString();
      
      console.log(`🔄 Scheduling retry for job ${job.id} in ${retryDelay}ms`);
      
      await this.supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          attempts: job.attempts + 1,
          scheduled_at: scheduledAt,
          error_message: errorMessage
        })
        .eq('id', job.id);
    } else {
      // Mark as permanently failed
      await this.updateJobStatus(job.id, 'failed', errorMessage);
      
      await this.broadcastEvent({
        topic: `source:${job.source_id}`,
        type: 'STATUS_CHANGED',
        sourceId: job.source_id,
        status: 'ERROR',
        metadata: { error: errorMessage, jobId: job.id }
      });
    }
  }

  private async updateJobStatus(jobId: string, status: string, errorMessage?: string): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'processing') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    await this.supabase
      .from('background_jobs')
      .update(updates)
      .eq('id', jobId);
  }

  private async broadcastEvent(event: any): Promise<void> {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/realtime-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to broadcast event:', error);
    }
  }

  private updateMetrics(success: boolean, processingTime: number): void {
    if (success) {
      this.metrics.processed++;
    } else {
      this.metrics.failed++;
    }
    
    // Update average processing time
    const totalJobs = this.metrics.processed + this.metrics.failed;
    this.metrics.avgProcessingTime = 
      (this.metrics.avgProcessingTime * (totalJobs - 1) + processingTime) / totalJobs;
  }

  async pollAndProcessJobs(maxJobs: number = 10): Promise<void> {
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
      console.error('❌ Error fetching jobs:', error);
      return;
    }

    this.metrics.queueDepth = jobs?.length || 0;

    if (jobs && jobs.length > 0) {
      console.log(`🚀 Processing ${jobs.length} jobs`);
      
      for (const job of jobs) {
        try {
          await this.processJob(job);
        } catch (error) {
          console.error(`❌ Failed to process job ${job.id}:`, error);
        }
      }
    } else {
      console.log('📭 No pending jobs found');
    }
  }

  getMetrics(): JobMetrics {
    return { ...this.metrics };
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

    const processor = new EnhancedJobProcessor(supabase);

    // Handle both GET and POST requests
    let requestBody: any = {};
    if (req.method === 'POST') {
      try {
        requestBody = await req.json();
      } catch (e) {
        // Ignore JSON parse errors for cron jobs
        requestBody = {};
      }
    }

    const maxJobs = requestBody.maxJobs || 50;
    console.log(`📋 Job processor invoked with maxJobs: ${maxJobs}`);

    // Process pending jobs
    await processor.pollAndProcessJobs(maxJobs);
    
    const metrics = processor.getMetrics();
    console.log(`📊 Processing metrics:`, metrics);

    return new Response(JSON.stringify({ 
      success: true,
      metrics,
      message: `Job processor completed, found ${metrics.queueDepth} jobs`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Error in workflow-job-processor:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
