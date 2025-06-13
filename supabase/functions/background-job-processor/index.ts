
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

class BackgroundJobProcessor {
  private supabase: any;
  private maxConcurrentJobs: number;

  constructor(supabase: any, maxConcurrentJobs: number = 10) {
    this.supabase = supabase;
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  async processJobs(): Promise<{ processed: number; failed: number }> {
    console.log('🔄 Starting background job processing...');

    // Get pending jobs
    const { data: jobs, error } = await this.supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(this.maxConcurrentJobs);

    if (error) {
      console.error('❌ Error fetching jobs:', error);
      return { processed: 0, failed: 0 };
    }

    if (!jobs || jobs.length === 0) {
      console.log('📭 No pending jobs found');
      return { processed: 0, failed: 0 };
    }

    console.log(`📋 Processing ${jobs.length} jobs...`);

    let processed = 0;
    let failed = 0;

    // Process jobs in parallel
    const promises = jobs.map(job => this.processJob(job));
    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value) {
          processed++;
        } else {
          failed++;
        }
      } else {
        failed++;
        console.error(`❌ Job ${jobs[index].id} failed:`, result.reason);
      }
    });

    console.log(`✅ Job processing completed: ${processed} successful, ${failed} failed`);
    return { processed, failed };
  }

  private async processJob(job: BackgroundJob): Promise<boolean> {
    console.log(`🚀 Processing job ${job.id} (${job.job_type})`);

    try {
      // Mark job as processing
      await this.updateJobStatus(job.id, 'processing');

      // Process based on job type
      switch (job.job_type) {
        case 'process_page':
          await this.processPageJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Mark as completed
      await this.updateJobStatus(job.id, 'completed');
      console.log(`✅ Job ${job.id} completed successfully`);
      return true;

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      await this.handleJobFailure(job, error);
      return false;
    }
  }

  private async processPageJob(job: BackgroundJob): Promise<void> {
    const { childJobId, url, parentSourceId } = job.payload;

    console.log(`📄 Processing page: ${url} (${childJobId})`);

    // Call the existing child-job-processor function
    const { data, error } = await this.supabase.functions.invoke('child-job-processor', {
      body: { childJobId }
    });

    if (error) {
      throw new Error(`Child job processor failed: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Child job processing failed');
    }

    console.log(`✅ Page processed successfully: ${url}`);
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

  private async handleJobFailure(job: BackgroundJob, error: any): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (job.attempts < job.max_attempts) {
      // Retry with exponential backoff
      const retryDelay = Math.min(Math.pow(2, job.attempts) * 1000, 60000);
      const scheduledAt = new Date(Date.now() + retryDelay).toISOString();

      await this.supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          attempts: job.attempts + 1,
          scheduled_at: scheduledAt,
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      console.log(`🔄 Job ${job.id} scheduled for retry in ${retryDelay}ms`);
    } else {
      // Mark as permanently failed
      await this.updateJobStatus(job.id, 'failed', errorMessage);
      console.log(`❌ Job ${job.id} permanently failed after ${job.attempts} attempts`);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const processor = new BackgroundJobProcessor(supabase, 10);
    const result = await processor.processJobs();

    return new Response(JSON.stringify({
      success: true,
      ...result,
      message: `Processed ${result.processed} jobs successfully, ${result.failed} failed`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Background job processor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
