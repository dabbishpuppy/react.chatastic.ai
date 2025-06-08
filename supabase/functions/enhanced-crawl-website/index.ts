
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleUrlDiscovery } from './discoveryHandler.ts';
import { createPagesAndJobsAtomically, ensureJobCompleteness } from './atomicJobCreator.ts';

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

    const body = await req.json();
    console.log('🚀 Enhanced crawl request received:', JSON.stringify(body, null, 2));

    const {
      url,
      agentId,
      parentSourceId,
      teamId,
      customerId,
      crawlMode = 'full-website',
      maxPages = 100,
      maxDepth,
      excludePaths = [],
      includePaths = [],
      respectRobots = true,
      enableCompression = true,
      enableDeduplication = true,
      priority = 'normal',
      mode
    } = body;

    console.log('📋 Extracted parameters:', {
      url,
      agentId,
      parentSourceId,
      teamId,
      customerId,
      crawlMode,
      maxPages,
      mode
    });

    // Handle recovery mode
    if (mode === 'recovery' && parentSourceId) {
      console.log('🔄 Recovery mode: ensuring job completeness');
      
      const recoveryResult = await ensureJobCompleteness(parentSourceId);
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'recovery',
          parentSourceId,
          recoveryResult,
          message: `Recovery completed: ${recoveryResult.recoveredJobs} jobs created for ${recoveryResult.orphanedPages} orphaned pages`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Validate required parameters
    if (!url) {
      console.error('❌ Missing required parameter: url');
      throw new Error('Missing required parameter: url');
    }

    if (!agentId && !parentSourceId) {
      console.error('❌ Missing required parameter: either agentId or parentSourceId must be provided');
      throw new Error('Missing required parameter: either agentId or parentSourceId must be provided');
    }

    let effectiveParentSourceId = parentSourceId;
    let effectiveTeamId = teamId || customerId;
    let effectiveCustomerId = customerId;

    // If we have agentId but no parentSourceId, we need to create a source first
    if (agentId && !parentSourceId) {
      console.log('🔨 Creating parent source for agentId:', agentId);
      
      // Get team info from agent
      const { data: agent, error: agentError } = await supabaseClient
        .from('agents')
        .select('team_id')
        .eq('id', agentId)
        .single();

      if (agentError) {
        console.error('❌ Agent query error:', agentError);
        throw new Error(`Failed to fetch agent: ${agentError.message}`);
      }

      if (!agent) {
        console.error('❌ Agent not found:', agentId);
        throw new Error(`Agent not found: ${agentId}`);
      }

      effectiveTeamId = agent.team_id;
      effectiveCustomerId = agent.team_id; // Use team_id as customer_id

      console.log('✅ Agent found, team_id:', effectiveTeamId);

      // Create the parent source
      const { data: source, error: sourceError } = await supabaseClient
        .from('agent_sources')
        .insert({
          agent_id: agentId,
          team_id: effectiveTeamId,
          url: url,
          title: url,
          source_type: 'website',
          crawl_status: 'pending',
          is_active: true,
          exclude_paths: excludePaths,
          include_paths: includePaths,
          metadata: {
            crawl_mode: crawlMode,
            max_pages: maxPages,
            max_depth: maxDepth,
            respect_robots: respectRobots,
            enable_compression: enableCompression,
            enable_deduplication: enableDeduplication,
            priority: priority,
            created_via: 'enhanced_crawl'
          }
        })
        .select()
        .single();

      if (sourceError) {
        console.error('❌ Source creation error:', sourceError);
        throw new Error(`Failed to create source: ${sourceError.message}`);
      }

      if (!source) {
        console.error('❌ No source returned from insert');
        throw new Error('Failed to create source: No source returned');
      }

      effectiveParentSourceId = source.id;
      console.log('✅ Created parent source:', effectiveParentSourceId);
    }

    // Final validation
    if (!effectiveParentSourceId) {
      console.error('❌ No effective parent source ID after processing');
      throw new Error('Failed to determine parent source ID');
    }

    if (!effectiveTeamId) {
      console.error('❌ No effective team ID after processing');
      throw new Error('Failed to determine team ID');
    }

    if (!effectiveCustomerId) {
      effectiveCustomerId = effectiveTeamId;
    }

    console.log('📊 Final effective parameters:', {
      effectiveParentSourceId,
      effectiveTeamId,
      effectiveCustomerId,
      crawlMode,
      maxPages
    });

    console.log(`🔍 Starting enhanced URL discovery for: ${url}`);
    console.log(`📊 Mode: ${crawlMode}, Max pages: ${maxPages}`);

    // Step 1: Discover URLs
    const discoveredUrls = await handleUrlDiscovery(
      url,
      crawlMode,
      maxPages,
      excludePaths,
      includePaths
    );

    console.log(`📋 Discovery completed: ${discoveredUrls.length} URLs found`);

    if (discoveredUrls.length === 0) {
      console.warn('⚠️ No URLs discovered for:', url);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No URLs discovered',
          parentSourceId: effectiveParentSourceId,
          discoveredUrls: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Step 2: Create pages and jobs atomically
    console.log('🔄 Creating pages and background jobs atomically...');
    
    const atomicResult = await createPagesAndJobsAtomically(
      effectiveParentSourceId,
      effectiveTeamId,
      discoveredUrls,
      effectiveCustomerId
    );

    if (!atomicResult.success) {
      console.error('❌ Atomic creation failed:', atomicResult.errors);
      throw new Error(`Atomic creation failed: ${atomicResult.errors.join(', ')}`);
    }

    console.log('✅ Atomic creation successful:', {
      pagesCreated: atomicResult.pagesCreated,
      jobsCreated: atomicResult.jobsCreated
    });

    // Step 3: Mark discovery as completed and update parent
    const { error: updateError } = await supabaseClient
      .from('agent_sources')
      .update({
        discovery_completed: true,
        total_children: atomicResult.pagesCreated,
        crawl_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', effectiveParentSourceId);

    if (updateError) {
      console.error('❌ Failed to update parent source:', updateError);
    } else {
      console.log('✅ Updated parent source status to in_progress');
    }

    // Step 4: Ensure job completeness (safety check)
    console.log('🔍 Performing job completeness verification...');
    const completenessResult = await ensureJobCompleteness(effectiveParentSourceId);

    const response = {
      success: true,
      parentSourceId: effectiveParentSourceId,
      discoveredUrls: discoveredUrls.length,
      pagesCreated: atomicResult.pagesCreated,
      jobsCreated: atomicResult.jobsCreated,
      transactionId: atomicResult.transactionId,
      completenessCheck: {
        orphanedPages: completenessResult.orphanedPages,
        recoveredJobs: completenessResult.recoveredJobs
      },
      crawlMode,
      maxPages,
      timestamp: new Date().toISOString(),
      message: `Enhanced crawl initiated: ${atomicResult.pagesCreated} pages with guaranteed job creation`
    };

    console.log('✅ Enhanced crawl setup completed:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Enhanced crawl error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Enhanced crawl failed',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
