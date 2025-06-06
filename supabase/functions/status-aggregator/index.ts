
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { parentSourceId, eventType } = await req.json();

    console.log(`📊 Status aggregator triggered for parent: ${parentSourceId}, event: ${eventType}`);

    // Get the parent source to check if it's in recrawl mode
    const { data: parentSource, error: parentError } = await supabaseClient
      .from('agent_sources')
      .select('crawl_status, metadata')
      .eq('id', parentSourceId)
      .single();

    if (parentError) {
      console.error('❌ Error fetching parent source:', parentError);
      throw parentError;
    }

    // Get source_pages statistics
    const { data: pages, error: pagesError } = await supabaseClient
      .from('source_pages')
      .select('*')
      .eq('parent_source_id', parentSourceId);

    if (pagesError) {
      console.error('❌ Error fetching source pages:', pagesError);
      throw pagesError;
    }

    const totalJobs = pages?.length || 0;
    const completedJobs = pages?.filter(page => page.status === 'completed').length || 0;
    const failedJobs = pages?.filter(page => page.status === 'failed').length || 0;
    const pendingJobs = pages?.filter(page => page.status === 'pending').length || 0;
    const inProgressJobs = pages?.filter(page => page.status === 'in_progress').length || 0;

    // Calculate progress
    const progress = totalJobs > 0 ? Math.round(((completedJobs + failedJobs) / totalJobs) * 100) : 0;

    // Determine status based on recrawl state
    let status = parentSource.crawl_status;
    const isRecrawling = parentSource.metadata?.is_recrawling;

    if (isRecrawling) {
      // We're in recrawl mode
      if (inProgressJobs > 0 || pendingJobs > 0) {
        status = 'recrawling';
      } else if (completedJobs + failedJobs === totalJobs && totalJobs > 0) {
        // All jobs completed during recrawl
        status = completedJobs > 0 ? 'ready_for_training' : 'failed';
      }
    } else {
      // Normal crawl flow
      if (totalJobs === 0) {
        status = 'pending';
      } else if (completedJobs === totalJobs) {
        status = 'ready_for_training';
      } else if (completedJobs + failedJobs === totalJobs) {
        status = 'ready_for_training';
      } else if (inProgressJobs > 0 || completedJobs > 0) {
        status = 'in_progress';
      }
    }

    // Calculate compression stats from completed jobs
    const completedJobsData = pages?.filter(job => job.status === 'completed') || [];
    const compressionStats = {
      totalContentSize: completedJobsData.reduce((sum, job) => sum + (job.content_size || 0), 0),
      avgCompressionRatio: completedJobsData.length > 0 
        ? completedJobsData.reduce((sum, job) => sum + (job.compression_ratio || 0), 0) / completedJobsData.length 
        : 0,
      totalUniqueChunks: completedJobsData.reduce((sum, job) => sum + (job.chunks_created || 0), 0),
      totalDuplicateChunks: completedJobsData.reduce((sum, job) => sum + (job.duplicates_found || 0), 0)
    };

    // Update parent source with aggregated data
    const updateData: any = {
      crawl_status: status,
      progress: progress,
      total_jobs: totalJobs,
      completed_jobs: completedJobs,
      failed_jobs: failedJobs,
      total_content_size: compressionStats.totalContentSize,
      unique_chunks: compressionStats.totalUniqueChunks,
      duplicate_chunks: compressionStats.totalDuplicateChunks,
      global_compression_ratio: compressionStats.avgCompressionRatio,
      updated_at: new Date().toISOString()
    };

    // Clear recrawl flag when transitioning to ready_for_training or failed
    if (status === 'ready_for_training' || status === 'failed') {
      updateData.metadata = {
        ...(parentSource.metadata || {}),
        is_recrawling: false,
        last_aggregation: new Date().toISOString()
      };
    }

    const { error: updateError } = await supabaseClient
      .from('agent_sources')
      .update(updateData)
      .eq('id', parentSourceId);

    if (updateError) {
      console.error('Error updating parent source:', updateError);
    } else {
      console.log(`✅ Parent source ${parentSourceId} updated to status: ${status}`);
    }

    const result = {
      parentSourceId,
      status,
      progress,
      totalJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
      inProgressJobs,
      compressionStats,
      isRecrawling: isRecrawling || false,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Status aggregated for ${parentSourceId}:`, result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in status aggregator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': "application/json" },
        status: 500,
      }
    );
  }
});
