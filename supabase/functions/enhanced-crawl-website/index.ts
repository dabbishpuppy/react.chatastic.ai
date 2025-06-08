
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleUrlDiscovery } from './discoveryHandler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`📥 Enhanced crawl request received at ${new Date().toISOString()}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body
    const {
      url,
      agentId,
      crawlMode = 'full-website',
      maxPages = 200, // Increased default for better discovery
      excludePaths = [],
      includePaths = [],
      discoverOnly = false
    } = await req.json();

    console.log('📋 Enhanced crawl parameters:', {
      url,
      agentId,
      crawlMode,
      maxPages,
      excludePaths: excludePaths.length,
      includePaths: includePaths.length,
      discoverOnly
    });

    // Validate required fields
    if (!url || !agentId) {
      throw new Error('Missing required fields: url and agentId');
    }

    // Fetch agent data with retries
    let agent;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔍 Fetching agent data (attempt ${attempt}/3)`);
      
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id, team_id')
        .eq('id', agentId)
        .single();

      if (agentError) {
        console.error(`Agent fetch error (attempt ${attempt}):`, agentError);
        if (attempt === 3) {
          throw new Error(`Agent not found: ${agentError.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      agent = agentData;
      break;
    }

    if (!agent) {
      throw new Error('Failed to fetch agent data after retries');
    }

    console.log('✅ Agent found:', { id: agent.id, team_id: agent.team_id });

    // Enhanced URL discovery
    const discoveredUrls = await handleUrlDiscovery(
      url,
      crawlMode,
      maxPages,
      excludePaths,
      includePaths
    );

    console.log(`📊 Enhanced discovery completed: ${discoveredUrls.length} URLs found`);

    // If discovery-only mode, return URLs without creating database records
    if (discoverOnly) {
      return new Response(JSON.stringify({
        success: true,
        mode: 'discovery-only',
        totalUrlsDiscovered: discoveredUrls.length,
        urls: discoveredUrls,
        crawlMode,
        maxPages
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Create parent source with enhanced metadata
    const { data: parentSource, error: sourceError } = await supabase
      .from('agent_sources')
      .insert({
        agent_id: agentId,
        team_id: agent.team_id,
        url: url,
        title: `Enhanced Crawl: ${new URL(url).hostname}`,
        source_type: 'website',
        crawl_status: 'pending',
        total_jobs: discoveredUrls.length,
        completed_jobs: 0,
        failed_jobs: 0,
        progress: 0,
        is_active: true,
        metadata: {
          crawlMode,
          maxPages,
          discoveredUrlCount: discoveredUrls.length,
          enhancedCrawl: true,
          excludePaths,
          includePaths
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sourceError) {
      console.error('❌ Failed to create parent source:', sourceError);
      throw new Error(`Failed to create parent source: ${sourceError.message}`);
    }

    console.log('✅ Parent source created:', parentSource.id);

    // Create source pages in optimized batches
    const batchSize = 50;
    let totalCreated = 0;
    
    for (let i = 0; i < discoveredUrls.length; i += batchSize) {
      const batch = discoveredUrls.slice(i, i + batchSize);
      
      const sourcePages = batch.map(discoveredUrl => ({
        parent_source_id: parentSource.id,
        customer_id: agent.team_id,
        url: discoveredUrl,
        status: 'pending' as const,
        retry_count: 0,
        created_at: new Date().toISOString()
      }));

      const { data: createdPages, error: pageError } = await supabase
        .from('source_pages')
        .insert(sourcePages)
        .select('id');

      if (pageError) {
        console.error(`❌ Failed to create source pages batch ${i}-${i + batch.length}:`, pageError);
        continue;
      }

      totalCreated += createdPages?.length || 0;
      console.log(`✅ Created batch ${Math.floor(i / batchSize) + 1}: ${createdPages?.length || 0} pages`);
    }

    console.log(`📊 Total source pages created: ${totalCreated}/${discoveredUrls.length}`);

    // Update parent source with final stats
    await supabase
      .from('agent_sources')
      .update({
        total_jobs: totalCreated,
        crawl_status: totalCreated > 0 ? 'in_progress' : 'failed'
      })
      .eq('id', parentSource.id);

    const result = {
      success: true,
      parentSourceId: parentSource.id,
      totalJobs: totalCreated,
      discoveredUrls: discoveredUrls.length,
      crawlMode,
      enhancedCrawl: true,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Enhanced crawl initiation completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Enhanced crawl error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
