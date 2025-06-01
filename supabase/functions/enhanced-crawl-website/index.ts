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

    console.log(`📊 Discovery completed: ${discoveredUrls.length} URLs found`);

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

    console.log(`✅ Parent source created with ID: ${parentSource.id}`);

    // Create source_pages with simplified structure and explicit type validation
    const sourcePages = discoveredUrls.map((discoveredUrl, index) => {
      // Only include the essential fields that match the source_pages table schema
      const sourcePage = {
        parent_source_id: parentSource.id, // uuid
        customer_id: agent.team_id, // uuid  
        url: String(discoveredUrl), // text - explicitly ensure it's a string
        status: 'pending', // text - use string literal, not String() constructor
        priority: priority || 'normal', // text - ensure it's a string
        retry_count: 0, // integer
        max_retries: 3 // integer
        // Removed created_at - let database handle the default
      };
      
      // Log the first few entries for debugging
      if (index < 3) {
        console.log(`🔍 Source page ${index + 1} simplified data:`, {
          parent_source_id: `${typeof sourcePage.parent_source_id} (${sourcePage.parent_source_id})`,
          customer_id: `${typeof sourcePage.customer_id} (${sourcePage.customer_id})`,
          url: `${typeof sourcePage.url} (${sourcePage.url.substring(0, 50)}...)`,
          status: `${typeof sourcePage.status} (${sourcePage.status})`,
          priority: `${typeof sourcePage.priority} (${sourcePage.priority})`,
          retry_count: `${typeof sourcePage.retry_count} (${sourcePage.retry_count})`,
          max_retries: `${typeof sourcePage.max_retries} (${sourcePage.max_retries})`
        });
      }
      
      return sourcePage;
    });

    console.log(`📝 Preparing to insert ${sourcePages.length} source pages with simplified structure`);

    // Insert source pages in smaller batches with better error handling
    const batchSize = 10; // Even smaller batches for better debugging
    let insertedJobs = 0;
    
    for (let i = 0; i < sourcePages.length; i += batchSize) {
      const batch = sourcePages.slice(i, i + batchSize);
      console.log(`📦 Inserting batch ${Math.floor(i/batchSize) + 1}: ${batch.length} pages (${i + 1}-${Math.min(i + batchSize, sourcePages.length)})`);
      
      try {
        const { data: insertedPages, error: pagesError } = await supabase
          .from('source_pages')
          .insert(batch)
          .select('id');
        
        if (pagesError) {
          console.error(`❌ Error inserting source pages batch ${Math.floor(i/batchSize) + 1}:`, {
            error: pagesError,
            errorCode: pagesError.code,
            errorMessage: pagesError.message,
            errorDetails: pagesError.details,
            batchSize: batch.length,
            firstUrl: batch[0]?.url,
            sampleData: batch[0]
          });
          
          // Try inserting the first row individually to isolate the exact problem
          console.log('🔧 Attempting individual row insertion for debugging...');
          try {
            const singleRow = batch[0];
            console.log(`🔍 Attempting to insert single row:`, JSON.stringify(singleRow, null, 2));
            
            const { data: singleResult, error: singleError } = await supabase
              .from('source_pages')
              .insert([singleRow])
              .select('id');
              
            if (singleError) {
              console.error(`❌ Single row failed with detailed error:`, {
                code: singleError.code,
                message: singleError.message,
                details: singleError.details,
                hint: singleError.hint
              });
            } else {
              console.log(`✅ Single row succeeded, this suggests a batch-specific issue`);
            }
          } catch (individualError) {
            console.error(`❌ Individual insertion exception:`, individualError);
          }
          
          throw new Error(`Batch insertion failed: ${pagesError.message} (Code: ${pagesError.code})`);
        } else {
          insertedJobs += batch.length;
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} inserted successfully: ${batch.length} pages`);
        }
      } catch (batchError) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} exception:`, batchError);
        throw batchError;
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
