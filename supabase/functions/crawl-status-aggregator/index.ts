
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

    // Listen for crawl job status changes
    const { parentSourceId } = await req.json()

    console.log(`🔍 Checking status for parent source: ${parentSourceId}`)

    // Get current job status counts
    const { data: jobStats, error: statsError } = await supabase
      .from('crawl_jobs')
      .select('status')
      .eq('parent_source_id', parentSourceId)

    if (statsError) {
      throw statsError
    }

    const totalJobs = jobStats.length
    const completedJobs = jobStats.filter(job => job.status === 'completed').length
    const failedJobs = jobStats.filter(job => job.status === 'failed').length
    const pendingJobs = jobStats.filter(job => job.status === 'pending').length
    const inProgressJobs = jobStats.filter(job => job.status === 'in_progress').length

    console.log(`📊 Status for ${parentSourceId}: ${completedJobs + failedJobs}/${totalJobs} complete`)

    // Calculate progress percentage
    const progress = totalJobs > 0 ? Math.round(((completedJobs + failedJobs) / totalJobs) * 100) : 0

    // Determine parent status
    let parentStatus = 'in_progress'
    if (totalJobs === 0) {
      parentStatus = 'failed'
    } else if (completedJobs + failedJobs === totalJobs) {
      parentStatus = 'completed'
    } else if (pendingJobs === totalJobs) {
      parentStatus = 'pending'
    }

    // Get compression stats
    const { data: compressionStats } = await supabase
      .from('crawl_jobs')
      .select('content_size, compression_ratio, chunks_created, duplicates_found')
      .eq('parent_source_id', parentSourceId)
      .eq('status', 'completed')

    const totalContentSize = compressionStats?.reduce((sum, job) => sum + (job.content_size || 0), 0) || 0
    const avgCompressionRatio = compressionStats?.length 
      ? compressionStats.reduce((sum, job) => sum + (job.compression_ratio || 0), 0) / compressionStats.length 
      : 0
    const totalUniqueChunks = compressionStats?.reduce((sum, job) => sum + (job.chunks_created || 0), 0) || 0
    const totalDuplicateChunks = compressionStats?.reduce((sum, job) => sum + (job.duplicates_found || 0), 0) || 0

    // Update parent source
    const { error: updateError } = await supabase
      .from('agent_sources')
      .update({
        crawl_status: parentStatus,
        progress: progress,
        total_jobs: totalJobs,
        completed_jobs: completedJobs,
        failed_jobs: failedJobs,
        total_content_size: totalContentSize,
        compressed_content_size: Math.round(totalContentSize * avgCompressionRatio),
        unique_chunks: totalUniqueChunks,
        duplicate_chunks: totalDuplicateChunks,
        global_compression_ratio: avgCompressionRatio,
        updated_at: new Date().toISOString(),
        ...(parentStatus === 'completed' && { last_crawled_at: new Date().toISOString() })
      })
      .eq('id', parentSourceId)

    if (updateError) {
      throw updateError
    }

    const result = {
      parentSourceId,
      status: parentStatus,
      progress,
      totalJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
      inProgressJobs,
      compressionStats: {
        totalContentSize,
        avgCompressionRatio,
        totalUniqueChunks,
        totalDuplicateChunks
      }
    }

    console.log(`✅ Updated parent source ${parentSourceId} to status: ${parentStatus}`)

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
