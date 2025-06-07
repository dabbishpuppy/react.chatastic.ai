
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DataFetcher } from './dataFetcher.ts';
import { StatisticsCalculator } from './statisticsCalculator.ts';
import { StatusCalculator } from './statusCalculator.ts';
import { MetadataManager } from './metadataManager.ts';
import { StatusAggregatorResult } from './types.ts';

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

    // Fetch data
    const parentSource = await DataFetcher.fetchParentSource(supabaseClient, parentSourceId);
    const pages = await DataFetcher.fetchSourcePages(supabaseClient, parentSourceId);

    // Calculate statistics
    const jobStats = StatisticsCalculator.calculateJobStatistics(pages);
    const { stats: compressionStats, totalChildSize, completedJobsData } = StatisticsCalculator.calculateCompressionStats(pages);
    
    // Determine status
    const status = StatusCalculator.determineStatus(
      parentSource,
      jobStats.totalJobs,
      jobStats.completedJobs,
      jobStats.failedJobs,
      jobStats.pendingJobs,
      jobStats.inProgressJobs
    );

    const progress = StatusCalculator.calculateProgress(
      jobStats.totalJobs,
      jobStats.completedJobs,
      jobStats.failedJobs
    );

    // Prepare update data
    const isRecrawling = parentSource.metadata?.is_recrawling === true;
    const metadata = MetadataManager.createMetadata(
      parentSource,
      status,
      totalChildSize,
      completedJobsData,
      isRecrawling
    );

    const updateData = {
      crawl_status: status,
      progress: progress,
      total_jobs: jobStats.totalJobs,
      completed_jobs: jobStats.completedJobs,
      failed_jobs: jobStats.failedJobs,
      total_content_size: compressionStats.totalContentSize,
      unique_chunks: compressionStats.totalUniqueChunks,
      duplicate_chunks: compressionStats.totalDuplicateChunks,
      global_compression_ratio: compressionStats.avgCompressionRatio,
      metadata: metadata,
      updated_at: new Date().toISOString()
    };

    console.log(`💾 Updating parent source with:`, updateData);

    const { error: updateError } = await supabaseClient
      .from('agent_sources')
      .update(updateData)
      .eq('id', parentSourceId);

    if (updateError) {
      console.error('❌ Error updating parent source:', updateError);
      throw updateError;
    }

    console.log(`✅ Parent source ${parentSourceId} updated to status: ${status}`);

    const result: StatusAggregatorResult = {
      parentSourceId,
      status,
      progress,
      totalJobs: jobStats.totalJobs,
      completedJobs: jobStats.completedJobs,
      failedJobs: jobStats.failedJobs,
      pendingJobs: jobStats.pendingJobs,
      inProgressJobs: jobStats.inProgressJobs,
      compressionStats,
      totalChildSize,
      isRecrawling: isRecrawling || false,
      debugInfo: {
        originalStatus: parentSource.crawl_status,
        newStatus: status,
        wasRecrawling: isRecrawling,
        recrawlStartedAt: parentSource.metadata?.recrawl_started_at,
        jobBreakdown: {
          total: jobStats.totalJobs,
          completed: jobStats.completedJobs,
          failed: jobStats.failedJobs,
          pending: jobStats.pendingJobs,
          inProgress: jobStats.inProgressJobs
        }
      },
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
    console.error('❌ Error in status aggregator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': "application/json" },
        status: 500,
      }
    );
  }
});
