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

// Type validation helper
function validateSourcePageRecord(record: any, index: number): void {
  if (typeof record.parent_source_id !== 'string') {
    throw new Error(`Record ${index}: parent_source_id must be string (UUID), got ${typeof record.parent_source_id}`);
  }
  if (typeof record.customer_id !== 'string') {
    throw new Error(`Record ${index}: customer_id must be string (UUID), got ${typeof record.customer_id}`);
  }
  if (typeof record.url !== 'string') {
    throw new Error(`Record ${index}: url must be string, got ${typeof record.url}`);
  }
  if (typeof record.status !== 'string') {
    throw new Error(`Record ${index}: status must be string, got ${typeof record.status}`);
  }
  if (typeof record.priority !== 'string') {
    throw new Error(`Record ${index}: priority must be string, got ${typeof record.priority}`);
  }
  if (typeof record.retry_count !== 'number') {
    throw new Error(`Record ${index}: retry_count must be number, got ${typeof record.retry_count}`);
  }
  if (typeof record.max_retries !== 'number') {
    throw new Error(`Record ${index}: max_retries must be number, got ${typeof record.max_retries}`);
  }
}

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

    // Create parent source with explicit type casting
    const parentSourceData = {
      agent_id: agentId,
      team_id: agent.team_id,
      source_type: 'website',
      title: url,
      url: url,
      crawl_status: 'pending',
      progress: 0,
      total_jobs: discoveredUrls.length,
      completed_jobs: 0,
      failed_jobs: 0,
      links_count: discoveredUrls.length,
      discovery_completed: false,
      respect_robots: respectRobots,
      is_active: true,
      metadata: {
        crawl_mode: crawlMode,
        enable_compression: enableCompression,
        enable_deduplication: enableDeduplication,
        priority: priority
      }
    };

    console.log('📝 Creating parent source with data:', JSON.stringify(parentSourceData, null, 2));

    const { data: parentSource, error: sourceError } = await supabase
      .from('agent_sources')
      .insert(parentSourceData)
      .select()
      .single();

    if (sourceError) {
      console.error('❌ Failed to create parent source:', sourceError);
      throw new Error(`Failed to create parent source: ${sourceError.message}`);
    }

    console.log(`✅ Parent source created with ID: ${parentSource.id}`);

    // Create source_pages with explicit type handling and RLS debugging
    if (discoveredUrls.length > 0) {
      console.log('🔍 Starting source pages insertion with enhanced debugging...');
      
      let insertedJobs = 0;
      const batchSize = 1; // Use single record for debugging
      
      // Test with a single record first to get detailed error info
      const sampleUrl = discoveredUrls[0];
      const testRecord = {
        parent_source_id: parentSource.id,
        customer_id: agent.team_id,
        url: sampleUrl,
        status: 'pending',
        priority: priority,
        retry_count: 0,
        max_retries: 3
      };

      console.log('🧪 Testing single record insertion:', JSON.stringify(testRecord, null, 2));
      console.log('🔍 Field types check:');
      console.log(`- parent_source_id: ${typeof testRecord.parent_source_id} (${testRecord.parent_source_id})`);
      console.log(`- customer_id: ${typeof testRecord.customer_id} (${testRecord.customer_id})`);
      console.log(`- url: ${typeof testRecord.url} (${testRecord.url})`);
      console.log(`- status: ${typeof testRecord.status} (${testRecord.status})`);
      console.log(`- priority: ${typeof testRecord.priority} (${testRecord.priority})`);
      console.log(`- retry_count: ${typeof testRecord.retry_count} (${testRecord.retry_count})`);
      console.log(`- max_retries: ${typeof testRecord.max_retries} (${testRecord.max_retries})`);

      // First, try to get RLS policies information
      try {
        const { data: rlsPolicies, error: rlsError } = await supabase
          .rpc('get_rls_policies_info', { table_name: 'source_pages' });
        
        if (!rlsError && rlsPolicies) {
          console.log('📋 RLS Policies found:', JSON.stringify(rlsPolicies, null, 2));
        }
      } catch (rlsCheckError) {
        console.log('ℹ️ Could not fetch RLS info (function may not exist)');
      }

      // Try insertion with detailed error capture
      const { data: insertResult, error: insertError } = await supabase
        .from('source_pages')
        .insert([testRecord])
        .select('id');
      
      if (insertError) {
        console.error('❌ Single record insertion failed with detailed error:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          record: testRecord
        });

        // Try to get more specific information about the error
        if (insertError.message.includes('operator does not exist: text = boolean')) {
          console.error('🚨 IDENTIFIED ISSUE: RLS policy is comparing text field to boolean');
          console.error('💡 This usually means an RLS policy has a condition like:');
          console.error('   WHERE some_text_field = true  (should be some_text_field = \'true\')');
          console.error('   OR some_boolean_field = \'true\'  (should be some_boolean_field = true)');
          
          // Try to bypass RLS temporarily for diagnosis (DANGEROUS - only for diagnosis)
          console.log('🔧 Attempting admin-level bypass for diagnosis...');
          
          try {
            // Use service role key to bypass RLS
            const adminClient = createClient(supabaseUrl, supabaseKey, {
              auth: {
                persistSession: false,
                autoRefreshToken: false
              }
            });

            const { data: bypassResult, error: bypassError } = await adminClient
              .from('source_pages')
              .insert([testRecord])
              .select('id');

            if (bypassError) {
              console.error('❌ Even admin bypass failed:', bypassError);
            } else {
              console.log('✅ Admin bypass succeeded - RLS policy is definitely the issue');
              console.log('🧹 Cleaning up test record...');
              await adminClient
                .from('source_pages')
                .delete()
                .eq('id', bypassResult[0].id);
            }
          } catch (bypassTestError) {
            console.error('❌ Bypass test failed:', bypassTestError);
          }
        }
        
        throw new Error(`Source pages insertion failed: ${insertError.message}`);
      } else {
        console.log('✅ Single record insertion succeeded:', insertResult);
        insertedJobs = 1;

        // Continue with remaining URLs if first one succeeded
        for (let i = 1; i < discoveredUrls.length; i += batchSize) {
          const batch = discoveredUrls.slice(i, i + batchSize);
          const batchRecords = batch.map((discoveredUrl) => ({
            parent_source_id: parentSource.id,
            customer_id: agent.team_id,
            url: discoveredUrl,
            status: 'pending',
            priority: priority,
            retry_count: 0,
            max_retries: 3
          }));

          const { data: batchResult, error: batchError } = await supabase
            .from('source_pages')
            .insert(batchRecords)
            .select('id');
          
          if (batchError) {
            console.error(`❌ Batch insertion failed:`, batchError);
            break;
          }
          
          insertedJobs += batch.length;
          console.log(`✅ Processed ${insertedJobs}/${discoveredUrls.length} URLs`);
        }
      }

      // Update parent source
      await supabase
        .from('agent_sources')
        .update({
          crawl_status: 'in_progress',
          discovery_completed: true,
          total_children: insertedJobs,
          updated_at: new Date().toISOString()
        })
        .eq('id', parentSource.id);

      console.log(`✅ Enhanced crawl initiated: ${insertedJobs} source pages created for ${discoveredUrls.length} URLs`);

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
