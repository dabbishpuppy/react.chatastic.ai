
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

interface EnhancedCrawlRequest {
  agentId: string;
  url: string;
  crawlMode?: 'full-website' | 'single-page' | 'sitemap-only';
  maxPages?: number;
  excludePaths?: string[];
  includePaths?: string[];
  respectRobots?: boolean;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  priority?: 'normal' | 'high' | 'slow';
}

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

    console.log('🚀 Starting enhanced crawl with compression for agent', agentId, ', URL:', url);

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

    // Create parent source
    const parentSourceData = {
      agent_id: agentId,
      team_id: agent.team_id,
      source_type: 'website' as const,
      title: url,
      url: url,
      crawl_status: 'pending' as const,
      exclude_paths: excludePaths,
      include_paths: includePaths,
      respect_robots: respectRobots,
      max_concurrent_jobs: 5,
      progress: 0,
      total_jobs: discoveredUrls.length,
      completed_jobs: 0,
      failed_jobs: 0,
      links_count: discoveredUrls.length,
      discovery_completed: false,
      metadata: {
        crawl_initiated_at: new Date().toISOString(),
        enhanced_pipeline: true,
        priority: priority,
        crawlMode: crawlMode,
        maxPages: maxPages,
        enableCompression: enableCompression,
        enableDeduplication: enableDeduplication,
        compression_enabled: enableCompression,
        global_deduplication: enableDeduplication,
        compression_algorithm: 'zstd-level-19'
      }
    };

    const { data: parentSource, error: sourceError } = await supabase
      .from('agent_sources')
      .insert(parentSourceData)
      .select()
      .single();

    if (sourceError) {
      throw new Error(`Failed to create parent source: ${sourceError.message}`);
    }

    // Create source_pages (child jobs) for each discovered URL
    const sourcePages = discoveredUrls.map((discoveredUrl, index) => ({
      parent_source_id: parentSource.id,
      customer_id: agent.team_id,
      url: discoveredUrl,
      status: 'pending' as const,
      priority: priority,
      created_at: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3
    }));

    // Insert source pages in batches to avoid timeout
    const batchSize = 50;
    let insertedJobs = 0;
    
    for (let i = 0; i < sourcePages.length; i += batchSize) {
      const batch = sourcePages.slice(i, i + batchSize);
      const { error: pagesError } = await supabase
        .from('source_pages')
        .insert(batch);
      
      if (pagesError) {
        console.error('Error inserting source pages batch:', pagesError);
      } else {
        insertedJobs += batch.length;
      }
    }

    // Mark discovery as completed and update parent source
    await supabase
      .from('agent_sources')
      .update({
        crawl_status: 'in_progress',
        discovery_completed: true,
        total_children: insertedJobs,
        metadata: {
          ...parentSourceData.metadata,
          jobs_created_at: new Date().toISOString(),
          jobs_inserted: insertedJobs
        }
      })
      .eq('id', parentSource.id);

    console.log(`✅ Enhanced crawl initiated: ${insertedJobs} jobs created for ${discoveredUrls.length} URLs`);

    return new Response(
      JSON.stringify({
        success: true,
        parentSourceId: parentSource.id,
        totalJobs: discoveredUrls.length,
        jobsCreated: insertedJobs,
        message: `Enhanced crawl initiated with ${discoveredUrls.length} URLs discovered`
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in enhanced crawl:', error);
    
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

// Discover links for full website crawl
async function discoverLinks(
  url: string,
  excludePaths: string[] = [],
  includePaths: string[] = [],
  maxPages: number = 100
): Promise<string[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return [url]; // Fallback to just the main URL
    }

    const html = await response.text();
    const linkPattern = /href\s*=\s*["']([^"']+)["']/gi;
    const discovered = new Set<string>([url]); // Always include the main URL

    let match;
    while ((match = linkPattern.exec(html)) !== null) {
      try {
        const linkUrl = new URL(match[1], url);
        
        // Only include same-domain links
        if (linkUrl.hostname === new URL(url).hostname) {
          const fullUrl = linkUrl.href;
          const path = linkUrl.pathname;
          
          // Apply filters
          if (shouldExcludePath(path, excludePaths)) continue;
          if (includePaths.length > 0 && !shouldIncludePath(path, includePaths)) continue;
          
          discovered.add(fullUrl);
          
          // Limit discovery to prevent runaway crawls
          if (discovered.size >= maxPages) break;
        }
      } catch (e) {
        continue; // Invalid URL, skip
      }
    }

    return Array.from(discovered);
  } catch (error) {
    console.error('Error discovering links:', error);
    return [url]; // Fallback to just the main URL
  }
}

// Discover sitemap links
async function discoverSitemapLinks(sitemapUrl: string): Promise<string[]> {
  try {
    console.log('🗺️ Discovering links from sitemap:', sitemapUrl);
    
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status}`);
    }

    const xmlText = await response.text();
    const urls = parseSitemapXml(xmlText);
    
    console.log(`✅ Discovered ${urls.length} URLs from sitemap`);
    return urls;
    
  } catch (error) {
    console.error('Error discovering sitemap links:', error);
    // Fallback to just the sitemap URL itself
    return [sitemapUrl];
  }
}

// Parse sitemap XML to extract URLs
function parseSitemapXml(xmlText: string): string[] {
  const urls: string[] = [];
  
  try {
    // Simple regex-based XML parsing
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    
    while ((match = locRegex.exec(xmlText)) !== null) {
      const url = match[1].trim();
      if (url && url.startsWith('http')) {
        urls.push(url);
      }
    }
    
    // If no URLs found, try sitemapindex format
    if (urls.length === 0) {
      const sitemapRegex = /<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g;
      while ((match = sitemapRegex.exec(xmlText)) !== null) {
        const sitemapUrl = match[1].trim();
        if (sitemapUrl && sitemapUrl.startsWith('http')) {
          urls.push(sitemapUrl);
        }
      }
    }
    
  } catch (error) {
    console.error('Error parsing sitemap XML:', error);
  }
  
  return urls;
}

function shouldExcludePath(path: string, excludePaths: string[]): boolean {
  const defaultExcludes = [
    '/wp-json/*', '/wp-admin/*', '/xmlrpc.php', '/checkout/*', 
    '/cart/*', '/admin/*', '/api/*', '*.json', '*.xml', '*.rss'
  ];
  
  const allExcludes = [...defaultExcludes, ...excludePaths];
  
  return allExcludes.some(pattern => {
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1));
    }
    return path === pattern;
  });
}

function shouldIncludePath(path: string, includePaths: string[]): boolean {
  return includePaths.some(pattern => {
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1));
    }
    return path === pattern;
  });
}
