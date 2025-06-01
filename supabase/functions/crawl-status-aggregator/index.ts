
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { parentSourceId } = await req.json()

    if (!parentSourceId) {
      throw new Error('Missing parentSourceId parameter')
    }

    console.log(`🔍 Aggregating status for parent source: ${parentSourceId}`)

    // Get crawl jobs statistics
    const { data: jobs, error: jobsError } = await supabase
      .from('crawl_jobs')
      .select('*')
      .eq('parent_source_id', parentSourceId)

    if (jobsError) {
      console.error('Error fetching crawl jobs:', jobsError)
      throw jobsError
    }

    const totalJobs = jobs?.length || 0
    const completedJobs = jobs?.filter(job => job.status === 'completed').length || 0
    const failedJobs = jobs?.filter(job => job.status === 'failed').length || 0
    const pendingJobs = jobs?.filter(job => job.status === 'pending').length || 0
    const inProgressJobs = jobs?.filter(job => job.status === 'in_progress').length || 0

    // Calculate progress
    const progress = totalJobs > 0 ? Math.round(((completedJobs + failedJobs) / totalJobs) * 100) : 0

    // Determine status
    let status = 'pending'
    if (totalJobs === 0) {
      status = 'pending'
    } else if (completedJobs + failedJobs === totalJobs) {
      status = 'completed'
    } else if (inProgressJobs > 0 || completedJobs > 0) {
      status = 'in_progress'
    }

    // Calculate compression stats from completed jobs
    const completedJobsData = jobs?.filter(job => job.status === 'completed') || []
    const compressionStats = {
      totalContentSize: completedJobsData.reduce((sum, job) => sum + (job.content_size || 0), 0),
      avgCompressionRatio: completedJobsData.length > 0 
        ? completedJobsData.reduce((sum, job) => sum + (job.compression_ratio || 0), 0) / completedJobsData.length 
        : 0,
      totalUniqueChunks: completedJobsData.reduce((sum, job) => sum + (job.chunks_created || 0), 0),
      totalDuplicateChunks: completedJobsData.reduce((sum, job) => sum + (job.duplicates_found || 0), 0)
    }

    // Update parent source with aggregated data
    const { error: updateError } = await supabase
      .from('agent_sources')
      .update({
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
      })
      .eq('id', parentSourceId)

    if (updateError) {
      console.error('Error updating parent source:', updateError)
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
      features: {
        compression: 'Advanced Multi-Level',
        deduplication: 'Global Cross-Customer',
        filtering: 'Enhanced Boilerplate Removal',
        workerQueue: 'Priority-Based Processing'
      },
      timestamp: new Date().toISOString()
    }

    console.log(`✅ Status aggregated for ${parentSourceId}:`, result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in status aggregator:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
