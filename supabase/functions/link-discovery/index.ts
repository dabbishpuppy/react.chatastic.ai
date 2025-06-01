
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_EXCLUDE_PATHS = [
  '/wp-json/*', '/wp-admin/*', '/xmlrpc.php', '/checkout/*', 
  '/cart/*', '/admin/*', '/api/*', '*.json', '*.xml', '*.rss',
  '/feed/*', '/sitemap*', '/search*', '/tag/*', '/category/*',
  '/author/*', '/comments/*', '/trackback/*', '/wp-content/uploads/*'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      parentSourceId, 
      customerId, 
      url, 
      excludePaths = [], 
      includePaths = [],
      maxPages = 100,
      priority = 'normal'
    } = await req.json();

    console.log(`🔍 Starting link discovery for: ${url}`);
    console.log(`📝 Parent source: ${parentSourceId}, Customer: ${customerId}`);

    // Combine default and custom exclude paths
    const allExcludePaths = [...DEFAULT_EXCLUDE_PATHS, ...excludePaths];
    
    const discoveredUrls = await discoverLinks(url, allExcludePaths, includePaths, maxPages);
    
    console.log(`✅ Discovered ${discoveredUrls.length} URLs`);

    // Spawn child jobs using the database function
    const { data: spawnResult, error: spawnError } = await supabaseClient
      .rpc('spawn_child_jobs', {
        parent_source_id_param: parentSourceId,
        customer_id_param: customerId,
        urls: discoveredUrls,
        priority_param: priority
      });

    if (spawnError) {
      console.error('❌ Error spawning child jobs:', spawnError);
      throw spawnError;
    }

    console.log(`🚀 Spawned ${spawnResult} child jobs successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        discoveredCount: discoveredUrls.length,
        spawnedJobs: spawnResult,
        urls: discoveredUrls.slice(0, 10) // Return first 10 for debugging
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Link discovery error:', error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

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
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch ${url}: ${response.status}`);
      return [url]; // Fallback to just the main URL
    }

    const html = await response.text();
    const baseUrl = new URL(url);
    const discovered = new Set<string>([url]); // Always include the main URL

    // Extract links using regex (simple but effective)
    const linkPattern = /href\s*=\s*["']([^"']+)["']/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null && discovered.size < maxPages) {
      try {
        const linkUrl = new URL(match[1], url);
        
        // Only include same-domain links
        if (linkUrl.hostname === baseUrl.hostname) {
          const fullUrl = linkUrl.href;
          const path = linkUrl.pathname;
          
          // Apply exclude filters
          if (shouldExcludePath(path, excludePaths)) {
            continue;
          }
          
          // Apply include filters (if specified)
          if (includePaths.length > 0 && !shouldIncludePath(path, includePaths)) {
            continue;
          }
          
          discovered.add(fullUrl);
        }
      } catch (e) {
        // Invalid URL, skip
        continue;
      }
    }

    return Array.from(discovered);
  } catch (error) {
    console.error('Error during link discovery:', error);
    return [url]; // Fallback to just the main URL
  }
}

function shouldExcludePath(path: string, excludePaths: string[]): boolean {
  return excludePaths.some(pattern => {
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1));
    }
    return path === pattern || path.includes(pattern);
  });
}

function shouldIncludePath(path: string, includePaths: string[]): boolean {
  return includePaths.some(pattern => {
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1));
    }
    return path === pattern || path.includes(pattern);
  });
}
