
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

    // Get agent and team information
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, team_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent not found');
    }

    console.log('✅ Agent found:', agent.team_id);

    // Discover URLs based on crawl mode
    let discoveredUrls: string[] = [];
    
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

    console.log(`📊 Discovery completed: ${discoveredUrls.length} URLs found`);

    // Create parent source
    const parentSource = await createParentSource(agentId, agent.team_id, {
      url,
      totalJobs: discoveredUrls.length,
      respectRobots,
      crawlMode,
      enableCompression,
      enableDeduplication,
      priority
    });

    console.log(`✅ Parent source created with ID: ${parentSource.id}`);

    // Create source_pages with strict type validation
    if (discoveredUrls.length > 0) {
      console.log('🔍 Starting source pages insertion...');
      
      try {
        // Insert source pages in batches with strict type validation
        await insertSourcePagesInBatches(parentSource.id, agent.team_id, discoveredUrls, priority);

        // Update parent source
        await updateParentSourceStatus(parentSource.id, 'in_progress', {
          discoveryCompleted: true,
          totalChildren: discoveredUrls.length,
          additionalMetadata: {
            ...parentSource.metadata,
            updated_at: new Date().toISOString()
          }
        });

        console.log(`✅ Enhanced crawl initiated: ${discoveredUrls.length} source pages processing`);

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
        await updateParentSourceStatus(parentSource.id, 'failed');

        throw new Error(`Source pages insertion failed: ${insertError.message}`);
      }
    } else {
      throw new Error('No URLs discovered for crawling');
    }

  } catch (error) {
    console.error('❌ Error in enhanced crawl:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
