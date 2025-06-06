import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EnhancedCrawlRequest } from './types.ts';
import { discoverLinks, discoverSitemapLinks } from './discovery.ts';
import { insertSourcePagesInBatches, createParentSource, updateParentSourceStatus } from './database.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client with proper error handling
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    // Parse request body with error handling
    let requestBody: EnhancedCrawlRequest & { discoverOnly?: boolean; parentSourceId?: string };
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

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
      priority = 'normal',
      discoverOnly = false,
      parentSourceId // For child page recrawl
    } = requestBody;

    console.log('🚀 Starting enhanced crawl for agent', agentId, ', URL:', url);
    console.log('🔧 Crawl settings:', { crawlMode, maxPages, excludePaths, includePaths, discoverOnly, parentSourceId });

    // Validate required fields
    if (!agentId || !url) {
      throw new Error('Missing required fields: agentId and url');
    }

    // Validate input parameters early to catch type issues
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

    // Get agent and team information with retry logic and proper error handling
    let agent;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`🔍 Fetching agent data (attempt ${retryCount + 1}/${maxRetries})`);
        
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('id, team_id')
          .eq('id', agentId)
          .single();

        if (agentError) {
          console.error(`❌ Agent lookup error (attempt ${retryCount + 1}):`, agentError);
          if (retryCount === maxRetries - 1) {
            throw new Error(`Agent not found: ${agentError.message}`);
          }
        } else {
          agent = agentData;
          console.log('✅ Agent found:', { id: agent.id, team_id: agent.team_id });
          break;
        }
      } catch (lookupError) {
        console.error(`❌ Agent lookup failed (attempt ${retryCount + 1}):`, lookupError);
        if (retryCount === maxRetries - 1) {
          throw new Error('Agent lookup failed after multiple attempts');
        }
      }
      
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
    }

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Validate that we have valid UUIDs
    if (typeof agent.team_id !== 'string') {
      throw new Error(`Invalid team_id type: expected string, got ${typeof agent.team_id}`);
    }

    // Handle child page recrawl case
    if (parentSourceId && crawlMode === 'single-page') {
      console.log('🔄 Processing child page recrawl for parent:', parentSourceId);
      
      // Mark parent as recrawling and reset progress
      const { error: parentUpdateError } = await supabase
        .from('agent_sources')
        .update({
          crawl_status: 'recrawling',
          progress: 0,
          metadata: {
            is_recrawling: true,
            recrawl_started_at: new Date().toISOString(),
            recrawl_target_url: url
          }
        })
        .eq('id', parentSourceId);

      if (parentUpdateError) {
        console.error('Error updating parent source for recrawl:', parentUpdateError);
        throw new Error(`Failed to initiate parent recrawl: ${parentUpdateError.message}`);
      }

      // For child page recrawl, we need to update the existing source_pages entry
      const { error: updateError } = await supabase
        .from('source_pages')
        .update({
          status: 'pending',
          started_at: null,
          completed_at: null,
          error_message: null,
          retry_count: 0
        })
        .eq('parent_source_id', parentSourceId)
        .eq('url', url);

      if (updateError) {
        console.error('Error updating child page status:', updateError);
        throw new Error(`Failed to update child page status: ${updateError.message}`);
      }

      // Call the process-source-pages function to handle the actual crawling
      const { data: processData, error: processError } = await supabase.functions.invoke('process-source-pages', {
        body: {
          parentSourceId: parentSourceId,
          targetUrl: url, // Process only this specific URL
          priority: safePriority
        }
      });

      if (processError) {
        console.error('Error calling process-source-pages:', processError);
        // Update the page status to failed
        await supabase
          .from('source_pages')
          .update({
            status: 'failed',
            error_message: `Processing failed: ${processError.message}`,
            completed_at: new Date().toISOString()
          })
          .eq('parent_source_id', parentSourceId)
          .eq('url', url);

        throw new Error(`Failed to process child page: ${processError.message}`);
      }

      console.log('✅ Child page recrawl initiated successfully');
      return new Response(
        JSON.stringify({
          success: true,
          message: `Child page recrawl initiated for ${url}`,
          parentSourceId: parentSourceId
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // Discover URLs based on crawl mode with timeout
    let discoveredUrls: string[] = [];
    
    try {
      console.log(`🔍 Starting URL discovery for mode: ${crawlMode}`);
      
      const discoveryPromise = (async () => {
        switch (crawlMode) {
          case 'single-page':
            return [url];
          case 'sitemap-only':
            return await discoverSitemapLinks(url, excludePaths, includePaths);
          case 'full-website':
          default:
            return await discoverLinks(url, excludePaths, includePaths, maxPages);
        }
      })();

      // Add timeout to discovery
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('URL discovery timeout')), 30000); // 30 second timeout
      });

      discoveredUrls = await Promise.race([discoveryPromise, timeoutPromise]) as string[];
      
    } catch (discoveryError) {
      console.error('❌ URL discovery error:', discoveryError);
      // Fallback to single URL to ensure we have something to process
      discoveredUrls = [url];
      console.log('🔄 Falling back to single URL due to discovery error');
    }

    console.log(`📊 Discovery completed: ${discoveredUrls.length} URLs found`);

    if (discoveredUrls.length === 0) {
      throw new Error('No URLs discovered for crawling');
    }

    // If this is discovery only, return the URLs without creating database records
    if (discoverOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          urls: discoveredUrls,
          message: `Discovered ${discoveredUrls.length} URLs`
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // Create parent source with retry logic
    let parentSource;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`🔧 Creating parent source (attempt ${retryCount + 1}/${maxRetries})`);
        
        parentSource = await createParentSource(agentId, agent.team_id, {
          url,
          totalJobs: discoveredUrls.length,
          respectRobots,
          crawlMode,
          enableCompression,
          enableDeduplication,
          priority: safePriority
        });
        console.log('✅ Parent source created:', parentSource.id);
        break;
      } catch (createError) {
        console.error(`❌ Parent source creation failed (attempt ${retryCount + 1}):`, createError);
        if (retryCount === maxRetries - 1) {
          throw new Error(`Failed to create parent source: ${createError.message}`);
        }
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    if (!parentSource) {
      throw new Error('Failed to create parent source after multiple attempts');
    }

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
          type_validation_passed: true,
          api_authentication_verified: true
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
      try {
        await updateParentSourceStatus(parentSource.id, 'failed', {
          discoveryCompleted: true,
          totalChildren: 0,
          additionalMetadata: {
            ...parentSource.metadata,
            insertion_failed_at: new Date().toISOString(),
            insertion_error: insertError instanceof Error ? insertError.message : String(insertError),
            api_authentication_error: insertError.message?.includes('No API key') || false
          }
        });
      } catch (updateError) {
        console.error('❌ Failed to update parent source status:', updateError);
      }

      throw new Error(`Source pages insertion failed: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
    }

  } catch (error) {
    console.error('❌ Error in enhanced crawl:', error);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('authentication') || error.message.includes('No API key')) {
        statusCode = 401;
        errorMessage = 'Authentication failed. Please ensure proper API credentials are configured.';
      } else if (error.message.includes('rate limit')) {
        statusCode = 429;
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.message.includes('Invalid JSON')) {
        statusCode = 400;
      } else if (error.message.includes('Missing required fields')) {
        statusCode = 400;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        debugInfo: {
          errorType: error.constructor.name,
          originalMessage: error instanceof Error ? error.message : String(error)
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode
      }
    );
  }
});
