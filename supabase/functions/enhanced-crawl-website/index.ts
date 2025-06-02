import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';
import { EnhancedCrawlRequest } from './types.ts';
import { discoverLinks, discoverSitemapLinks } from './discovery.ts';
import { insertSourcePagesInBatches, createParentSource, updateParentSourceStatus } from './database.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    let requestBody: EnhancedCrawlRequest;
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
      priority = 'normal'
    } = requestBody;

    console.log('🚀 Starting enhanced crawl for agent', agentId, ', URL:', url);
    console.log('🔧 Crawl settings:', { crawlMode, maxPages, excludePaths, includePaths });

    // Validate required fields
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

    // Get agent and team information with retry logic
    let agent;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
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

    console.log('✅ Agent found:', agent.team_id);

    // Validate that we have valid UUIDs
    if (typeof agent.team_id !== 'string') {
      throw new Error(`Invalid team_id type: expected string, got ${typeof agent.team_id}`);
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

    // Create parent source with retry logic
    let parentSource;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        parentSource = await createParentSource(agentId, agent.team_id, {
          url,
          totalJobs: discoveredUrls.length,
          respectRobots,
          crawlMode,
          enableCompression,
          enableDeduplication,
          priority: safePriority
        });
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
      try {
        await updateParentSourceStatus(parentSource.id, 'failed', {
          discoveryCompleted: true,
          totalChildren: 0,
          additionalMetadata: {
            ...parentSource.metadata,
            insertion_failed_at: new Date().toISOString(),
            insertion_error: insertError instanceof Error ? insertError.message : String(insertError)
          }
        });
      } catch (updateError) {
        console.error('❌ Failed to update parent source status:', updateError);
      }

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
        status: 500
      }
    );
  }
});
