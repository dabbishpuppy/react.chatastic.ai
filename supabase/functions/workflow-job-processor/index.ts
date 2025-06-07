
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
}

class JobProcessor {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async processJob(job: BackgroundJob): Promise<void> {
    console.log(`Processing job: ${job.job_type} for source: ${job.source_id}`);

    try {
      await this.updateJobStatus(job.id, 'processing');

      switch (job.job_type) {
        case 'crawl_pages':
          await this.handleCrawlPages(job);
          break;
        case 'train_pages':
          await this.handleTrainPages(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      await this.updateJobStatus(job.id, 'completed');
      console.log(`Job completed: ${job.id}`);

    } catch (error) {
      console.error(`Job failed: ${job.id}`, error);
      await this.updateJobStatus(job.id, 'failed', error.message);

      // Retry logic
      if (job.attempts < job.max_attempts) {
        await this.retryJob(job);
      }
    }
  }

  private async handleCrawlPages(job: BackgroundJob): Promise<void> {
    const { source_id, config } = job.payload;
    
    console.log(`Starting crawl for source: ${source_id}`);
    
    // This would integrate with your existing crawl service
    // For now, we'll simulate the crawl process
    
    // Transition source to CRAWLING status
    await this.supabase.rpc('transition_source_status', {
      p_source_id: source_id,
      p_new_status: 'CRAWLING',
      p_event_type: 'CRAWL_STARTED',
      p_metadata: { job_id: job.id, config }
    });

    // Simulate crawl completion after a delay
    setTimeout(async () => {
      await this.supabase.rpc('transition_source_status', {
        p_source_id: source_id,
        p_new_status: 'COMPLETED',
        p_event_type: 'CRAWL_COMPLETED',
        p_metadata: { job_id: job.id, completed_at: new Date().toISOString() }
      });
    }, 5000);
  }

  private async handleTrainPages(job: BackgroundJob): Promise<void> {
    const { source_id } = job.payload;
    
    console.log(`Starting training for source: ${source_id}`);
    
    // Transition source to TRAINING status
    await this.supabase.rpc('transition_source_status', {
      p_source_id: source_id,
      p_new_status: 'TRAINING',
      p_event_type: 'TRAINING_STARTED',
      p_metadata: { job_id: job.id }
    });

    // Simulate training completion
    setTimeout(async () => {
      await this.supabase.rpc('transition_source_status', {
        p_source_id: source_id,
        p_new_status: 'TRAINED',
        p_event_type: 'TRAINING_COMPLETED',
        p_metadata: { job_id: job.id, completed_at: new Date().toISOString() }
      });
    }, 3000);
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

  private async retryJob(job: BackgroundJob): Promise<void> {
    const retryDelay = Math.pow(2, job.attempts) * 1000; // Exponential backoff
    
    setTimeout(async () => {
      await this.supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          attempts: job.attempts + 1,
          scheduled_at: new Date(Date.now() + retryDelay).toISOString()
        })
        .eq('id', job.id);
    }, retryDelay);
  }

  async pollAndProcessJobs(): Promise<void> {
    console.log('Polling for pending jobs...');

    const { data: jobs, error } = await this.supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }

    if (jobs && jobs.length > 0) {
      console.log(`Processing ${jobs.length} jobs`);
      
      for (const job of jobs) {
        await this.processJob(job);
      }
    }
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

    const processor = new JobProcessor(supabase);

    if (req.method === 'POST') {
      // Manual job processing trigger
      await processor.pollAndProcessJobs();
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Health check
    return new Response(JSON.stringify({ status: 'healthy' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in workflow-job-processor:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
