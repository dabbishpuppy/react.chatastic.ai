
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { validateRequest } from './requestValidator.ts';
import { validateAgent } from './agentValidator.ts';
import { handleChildPageRecrawl, handleAllChildrenRecrawl } from './recrawlHandler.ts';
import { handleUrlDiscovery } from './discoveryHandler.ts';
import { handleParentSourceCreation, handleSourcePagesCreation } from './parentSourceHandler.ts';
import { buildErrorResponse, buildSuccessResponse } from './responseBuilder.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    let requestBody;
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

    // Validate request
    const validatedRequest = validateRequest(requestBody);
    console.log('🚀 Starting enhanced crawl for agent', validatedRequest.agentId, ', URL:', validatedRequest.url, ', Mode:', validatedRequest.mode);

    // Validate agent
    const agent = await validateAgent(validatedRequest.agentId);

    // Handle recrawl-all-children mode
    if (validatedRequest.mode === 'recrawl-all-children') {
      console.log('🔄 Processing recrawl-all-children for parent:', validatedRequest.parentSourceId);
      
      if (!validatedRequest.parentSourceId) {
        throw new Error('parentSourceId is required for recrawl-all-children mode');
      }

      const result = await handleAllChildrenRecrawl(
        validatedRequest.parentSourceId,
        validatedRequest.agentId
      );

      return buildSuccessResponse(result, corsHeaders);
    }

    // Handle child page recrawl case
    if (validatedRequest.mode === 'recrawl-child-page') {
      console.log('🔄 Processing child page recrawl for parent:', validatedRequest.parentSourceId);
      
      if (!validatedRequest.parentSourceId) {
        throw new Error('parentSourceId is required for recrawl-child-page mode');
      }
      
      const result = await handleChildPageRecrawl(
        validatedRequest.parentSourceId,
        validatedRequest.url,
        validatedRequest.priority,
        validatedRequest.agentId
      );

      return buildSuccessResponse(result, corsHeaders);
    }

    // Handle single-page recrawl with parentSourceId (backward compatibility)
    if (validatedRequest.parentSourceId && validatedRequest.crawlMode === 'single-page') {
      console.log('🔄 Processing child page recrawl for parent:', validatedRequest.parentSourceId);
      
      const result = await handleChildPageRecrawl(
        validatedRequest.parentSourceId,
        validatedRequest.url,
        validatedRequest.priority,
        validatedRequest.agentId
      );

      return buildSuccessResponse(result, corsHeaders);
    }

    // Discover URLs based on crawl mode with timeout
    const discoveredUrls = await handleUrlDiscovery(
      validatedRequest.url,
      validatedRequest.crawlMode,
      validatedRequest.maxPages,
      validatedRequest.excludePaths,
      validatedRequest.includePaths
    );

    // If this is discovery only, return the URLs without creating database records
    if (validatedRequest.discoverOnly) {
      return buildSuccessResponse({
        success: true,
        urls: discoveredUrls,
        message: `Discovered ${discoveredUrls.length} URLs`
      }, corsHeaders);
    }

    // Create parent source with retry logic
    const parentSource = await handleParentSourceCreation(
      validatedRequest.agentId,
      agent.team_id,
      validatedRequest.url,
      discoveredUrls,
      {
        respectRobots: validatedRequest.respectRobots,
        crawlMode: validatedRequest.crawlMode,
        enableCompression: validatedRequest.enableCompression,
        enableDeduplication: validatedRequest.enableDeduplication,
        priority: validatedRequest.priority
      }
    );

    // Create source_pages with enhanced error handling and type validation
    const result = await handleSourcePagesCreation(
      parentSource.id,
      agent.team_id,
      discoveredUrls,
      validatedRequest.priority,
      parentSource
    );

    return buildSuccessResponse(result, corsHeaders);

  } catch (error) {
    return buildErrorResponse(error, corsHeaders);
  }
});
