
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';
import { EnhancedCrawlRequest } from './types.ts';
import { discoverLinks, discoverSitemapLinks } from './discovery.ts';
import { insertSourcePagesInBatches, createParentSource, updateParentSourceStatus } from './database.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody: EnhancedCrawlRequest = await req.json();
    const { 
      agentId, 
      url, 
      crawlMode = 'full-website',
      maxPages = 100,
      excludePaths = [],
      includePaths = [],
      respectRobots = true,
      enableCompression = true,
      enableDeduplication = true,
      priority = 'normal'
    } = requestBody;

    console.log('🚀 Starting enhanced crawl for agent', agentId, ', URL:', url);

    if (!agentId || !url) {
      throw new Error('Missing required fields: agentId and url');
    }

    // Validate input parameters early to catch type issues - ensure strings
    if (typeof agentId !== 'string') {
      throw new Error(`agentId must be a string, got ${typeof agentId}`);
    }
    if (typeof url !== 'string') {
      throw new Error(`url must be a string, got ${typeof url}`);
    }
    
    // CRITICAL: Ensure priority is always a string, never boolean
    const safePriority = String(priority || 'normal');
    if (!['normal', 'high', 'slow'].includes(safePriority)) {
      throw new Error(`priority must be one of: normal, high, slow, got ${safePriority}`);
    }

    console.log('🔍 Input type validation passed:', {
      agentId: `${typeof agentId} (${agentId})`,
      url: `${typeof url} (${url})`,
      priority: `${typeof safePriority} (${safePriority})`
    });

    // Get agent and team information
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, team_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('❌ Agent lookup error:', agentError);
      throw new Error('Agent not found');
    }

    console.log('✅ Agent found:', agent.team_id);

    // Validate that we have valid UUIDs
    if (typeof agent.team_id !== 'string') {
      throw new Error(`Invalid team_id type: expected string, got ${typeof agent.team_id}`);
    }

    // Discover URLs based on crawl mode
    let discoveredUrls: string[] = [];
    
    try {
      switch (crawlMode) {
        case 'single-page':
          discoveredUrls = [url];
          break;
        case 'sitemap-only':
          discoveredUrls = await discoverSitemapLinks(url);
          break;
        case 'full-website':
        default:
          discoveredUrls = await discoverLinks(url, excludePaths, includePaths, maxPages);
          break;
      }
    } catch (discoveryError) {
      console.error('❌ URL discovery error:', discoveryError);
      // Fallback to single URL to ensure we have something to process
      discoveredUrls = [url];
    }

    console.log(`📊 Discovery completed: ${discoveredUrls.length} URLs found`);

    if (discoveredUrls.length === 0) {
      throw new Error('No URLs discovered for crawling');
    }

    // Create parent source
    const parentSource = await createParentSource(agentId, agent.team_id, {
      url,
      totalJobs: discoveredUrls.length,
      respectRobots,
      crawlMode,
      enableCompression,
      enableDeduplication,
      priority: safePriority  // Use the string-safe priority
    });

    console.log(`✅ Parent source created with ID: ${parentSource.id}`);

    // Validate parent source ID before proceeding
    if (!parentSource.id || typeof parentSource.id !== 'string') {
      throw new Error(`Invalid parent source ID: ${parentSource.id}`);
    }

    // Create source_pages with enhanced error handling and type validation
    console.log('🔍 Starting source pages insertion with type-safe validation...');
    
    try {
      // Log the data types we're about to insert for debugging
      console.log('📋 Input validation summary:', {
        parentSourceId: `${typeof parentSource.id} (${parentSource.id})`,
        teamId: `${typeof agent.team_id} (${agent.team_id})`,
        urlCount: discoveredUrls.length,
        priority: `${typeof safePriority} (${safePriority})`,
        sampleUrl: `${typeof discoveredUrls[0]} (${discoveredUrls[0]})`
      });

      await insertSourcePagesInBatches(parentSource.id, agent.team_id, discoveredUrls, safePriority);

      // Update parent source status to in_progress
      await updateParentSourceStatus(parentSource.id, 'in_progress', {
        discoveryCompleted: true,
        totalChildren: discoveredUrls.length,
        additionalMetadata: {
          ...parentSource.metadata,
          insertion_completed_at: new Date().toISOString(),
          type_validation_passed: true
        }
      });

      console.log(`✅ Enhanced crawl initiated successfully: ${discoveredUrls.length} source pages created`);

      return new Response(
        JSON.stringify({
          success: true,
          parentSourceId: parentSource.id,
          totalJobs: discoveredUrls.length,
          message: `Enhanced crawl initiated with ${discoveredUrls.length} URLs discovered`
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );

    } catch (insertError) {
      console.error('❌ Source pages insertion failed:', insertError);
      
      // Update parent source to failed status
      await updateParentSourceStatus(parentSource.id, 'failed', {
        discoveryCompleted: true,
        totalChildren: 0,
        additionalMetadata: {
          ...parentSource.metadata,
          insertion_failed_at: new Date().toISOString(),
          insertion_error: insertError instanceof Error ? insertError.message : String(insertError)
        }
      });

      throw new Error(`Source pages insertion failed: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
    }

  } catch (error) {
    console.error('❌ Error in enhanced crawl:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
