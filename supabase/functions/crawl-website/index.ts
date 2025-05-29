
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Comprehensive file extensions to exclude
const EXCLUDED_EXTENSIONS = [
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff', 'avif',
  // Scripts
  'js', 'min.js', 'ts', 'coffee', 'map',
  // Styles
  'css', 'scss', 'sass', 'less', 'min.css',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt',
  // Archives
  'zip', 'rar', 'tar', 'gz', '7z', 'bz2',
  // Media
  'mp4', 'mp3', 'wav', 'avi', 'mov', 'webm', 'flv', 'mkv', 'wmv',
  // Fonts
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  // Other
  'xml', 'json', 'csv', 'rss', 'atom'
];

// Path patterns to exclude
const EXCLUDED_PATH_PATTERNS = [
  // API endpoints
  '/api/', '/rest/', '/graphql/', '/wp-json/',
  // Admin areas
  '/admin/', '/dashboard/', '/backend/', '/control-panel/',
  // WordPress specific
  '/wp-content/', '/wp-admin/', '/wp-includes/',
  // Drupal specific
  '/sites/default/files/', '/node/', '/user/',
  // Asset directories
  '/assets/', '/static/', '/public/', '/dist/', '/build/', '/uploads/',
  // System files
  '/robots.txt', '/sitemap.xml', '/favicon.ico', '/.well-known/',
  // Feeds
  '/feed/', '/rss/', '/feeds/',
  // Common utility paths
  '/search/', '/login/', '/register/', '/checkout/', '/cart/'
];

// Tracking parameters to remove
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'mc_cid', 'mc_eid', '_ga', '_gl'
];

function normalizeUrl(url: string): string {
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    
    // Remove tracking parameters
    TRACKING_PARAMS.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Remove fragment
    urlObj.hash = '';
    
    // Normalize trailing slash for paths
    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    return urlObj.toString();
  } catch {
    // If still invalid, try with http://
    try {
      const httpUrl = url.startsWith('http') ? url : 'http://' + url;
      return new URL(httpUrl).toString();
    } catch {
      return url;
    }
  }
}

function extractDomain(url: string): string {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);
    return urlObj.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isValidFrontendUrl(url: string, baseDomain: string): boolean {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);
    const urlDomain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    
    // Must be same domain
    if (urlDomain !== baseDomain) {
      return false;
    }
    
    // Check for excluded file extensions
    const pathname = urlObj.pathname.toLowerCase();
    const extension = pathname.split('.').pop();
    if (extension && EXCLUDED_EXTENSIONS.includes(extension)) {
      return false;
    }
    
    // Check for excluded path patterns
    for (const pattern of EXCLUDED_PATH_PATTERNS) {
      if (pathname.includes(pattern.toLowerCase())) {
        return false;
      }
    }
    
    // Exclude very long URLs (likely not content pages)
    if (url.length > 200) {
      return false;
    }
    
    // Exclude URLs with too many path segments (likely not main content)
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length > 5) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Enhanced recursive crawling function
async function recursiveCrawlWebsite(sourceId: string, url: string, crawlType: string) {
  console.log(`🕷️ Starting recursive crawl for ${url} with type ${crawlType}`);
  
  try {
    // Normalize URL first
    const normalizedUrl = normalizeUrl(url);
    console.log(`🔧 Normalized URL: ${normalizedUrl}`);
    
    // Update status to in_progress
    console.log(`📝 Updating source ${sourceId} status to in_progress`);
    await supabase
      .from('agent_sources')
      .update({ 
        crawl_status: 'in_progress', 
        progress: 10,
        last_crawled_at: new Date().toISOString(),
        url: normalizedUrl  // Update with normalized URL
      })
      .eq('id', sourceId);

    // Get the source to access agent_id and team_id
    const { data: source, error: sourceError } = await supabase
      .from('agent_sources')
      .select('agent_id, team_id, metadata')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      throw new Error(`Source not found: ${sourceError?.message}`);
    }

    console.log(`📊 Source found: agent_id=${source.agent_id}, team_id=${source.team_id}`);

    // Extract base domain for filtering
    const baseDomain = extractDomain(normalizedUrl);
    console.log(`🌐 Base domain: ${baseDomain}`);

    if (!baseDomain) {
      throw new Error(`Invalid domain extracted from URL: ${normalizedUrl}`);
    }

    // Initialize crawling state
    const crawledUrls = new Set<string>();
    const discoveredLinks = new Set<string>();
    let totalProcessed = 0;

    if (crawlType === 'individual-link') {
      // For individual links, just process the single URL
      console.log(`📄 Processing individual link: ${normalizedUrl}`);
      discoveredLinks.add(normalizedUrl);
    } else if (crawlType === 'sitemap') {
      // For sitemap, fetch and parse the sitemap
      console.log(`🗺️ Fetching sitemap from: ${normalizedUrl}`);
      const sitemapLinks = await fetchSitemapLinks(normalizedUrl, baseDomain);
      sitemapLinks.forEach(link => discoveredLinks.add(link));
    } else {
      // For crawl-links, start recursive discovery
      console.log(`🔍 Starting recursive link discovery from: ${normalizedUrl}`);
      await discoverLinksRecursively(normalizedUrl, baseDomain, crawledUrls, discoveredLinks, source.metadata, 0, 3);
    }

    console.log(`✅ Discovered ${discoveredLinks.size} unique links total`);

    // Update progress to 50%
    await supabase
      .from('agent_sources')
      .update({ 
        progress: 50,
        links_count: discoveredLinks.size
      })
      .eq('id', sourceId);

    // Create child sources for all discovered links
    if (discoveredLinks.size > 0) {
      console.log(`📝 Creating ${discoveredLinks.size} child sources`);
      const linksArray = Array.from(discoveredLinks);
      
      // Process in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < linksArray.length; i += batchSize) {
        const batch = linksArray.slice(i, i + batchSize);
        const childSources = batch.map(link => ({
          agent_id: source.agent_id,
          team_id: source.team_id,
          source_type: 'website' as const,
          title: link,
          url: link,
          parent_source_id: sourceId,
          crawl_status: 'completed',
          metadata: {
            crawlType: 'individual-link',
            parentUrl: normalizedUrl,
            discoveredAt: new Date().toISOString()
          },
          created_by: null
        }));

        const { error: insertError } = await supabase
          .from('agent_sources')
          .insert(childSources);

        if (insertError) {
          console.error(`❌ Error inserting batch ${i}-${i + batch.length}:`, insertError);
        } else {
          console.log(`✅ Created batch ${i}-${i + batch.length} of child sources`);
        }

        // Update progress incrementally
        const progressPercent = Math.min(50 + (i / linksArray.length) * 40, 90);
        await supabase
          .from('agent_sources')
          .update({ progress: Math.round(progressPercent) })
          .eq('id', sourceId);
      }
    }

    // Final update - mark as completed
    await supabase
      .from('agent_sources')
      .update({ 
        crawl_status: 'completed',
        progress: 100,
        links_count: discoveredLinks.size,
        last_crawled_at: new Date().toISOString()
      })
      .eq('id', sourceId);

    console.log(`✅ Crawl completed for ${normalizedUrl} - found ${discoveredLinks.size} unique links`);
    
  } catch (error) {
    console.error(`❌ Crawl failed for ${url}:`, error);
    
    // Update status to failed
    await supabase
      .from('agent_sources')
      .update({ 
        crawl_status: 'failed',
        metadata: {
          error: error.message,
          failedAt: new Date().toISOString()
        }
      })
      .eq('id', sourceId);
  }
}

// Recursive link discovery function
async function discoverLinksRecursively(
  url: string, 
  baseDomain: string, 
  crawledUrls: Set<string>, 
  discoveredLinks: Set<string>,
  metadata: any,
  currentDepth: number,
  maxDepth: number
): Promise<void> {
  // Stop if we've reached max depth or already crawled this URL
  if (currentDepth > maxDepth || crawledUrls.has(url)) {
    return;
  }

  console.log(`🔍 Crawling depth ${currentDepth}: ${url}`);
  crawledUrls.add(url);

  try {
    const pageLinks = await discoverLinksFromPage(url, metadata, baseDomain);
    
    // Add all discovered links
    pageLinks.forEach(link => discoveredLinks.add(link));
    console.log(`📊 Found ${pageLinks.length} new links on ${url}`);

    // If we haven't reached max depth, recursively crawl some of the discovered links
    if (currentDepth < maxDepth) {
      // Limit the number of links we recursively crawl from each page to prevent explosion
      const linksToRecurse = pageLinks.slice(0, 5);
      
      for (const link of linksToRecurse) {
        if (!crawledUrls.has(link)) {
          // Add small delay between requests
          await new Promise(resolve => setTimeout(resolve, 100));
          await discoverLinksRecursively(link, baseDomain, crawledUrls, discoveredLinks, metadata, currentDepth + 1, maxDepth);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error crawling ${url}:`, error);
  }
}

async function fetchSitemapLinks(sitemapUrl: string, baseDomain: string): Promise<string[]> {
  try {
    const normalizedUrl = normalizeUrl(sitemapUrl);
    console.log(`🌐 Fetching sitemap from: ${normalizedUrl}`);
    const response = await fetch(normalizedUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const sitemapContent = await response.text();
    
    // Simple XML parsing to extract URLs
    const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
    if (!urlMatches) {
      console.log('📄 No URLs found in sitemap');
      return [];
    }
    
    const rawLinks = urlMatches
      .map(match => match.replace(/<\/?loc>/g, ''))
      .filter(url => url.startsWith('http'));
    
    // Filter and normalize links
    const validLinks = rawLinks
      .filter(link => isValidFrontendUrl(link, baseDomain))
      .map(link => normalizeUrl(link))
      .filter((link, index, array) => array.indexOf(link) === index); // Remove duplicates
    
    console.log(`📊 Filtered ${rawLinks.length} raw URLs to ${validLinks.length} valid frontend URLs from sitemap`);
    return validLinks;
  } catch (error) {
    console.error('❌ Error fetching sitemap:', error);
    return [];
  }
}

async function discoverLinksFromPage(url: string, metadata: any, baseDomain: string): Promise<string[]> {
  try {
    const normalizedUrl = normalizeUrl(url);
    console.log(`🌐 Fetching page content from: ${normalizedUrl}`);
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebCrawler/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Enhanced regex to find links with better accuracy
    const linkMatches = html.match(/href=["'](https?:\/\/[^"'>\s]+)["']/gi);
    if (!linkMatches) {
      console.log('📄 No links found on page');
      return [];
    }
    
    let rawLinks = linkMatches
      .map(match => match.replace(/href=["']/i, '').replace(/["']$/, ''))
      .filter(link => link.startsWith('http'));

    console.log(`🔍 Found ${rawLinks.length} raw links on page`);

    // Filter for valid frontend URLs
    let validLinks = rawLinks.filter(link => isValidFrontendUrl(link, baseDomain));
    console.log(`✅ Filtered to ${validLinks.length} valid frontend links`);

    // Normalize URLs and remove duplicates
    validLinks = validLinks
      .map(link => normalizeUrl(link))
      .filter((link, index, array) => array.indexOf(link) === index);
    
    console.log(`🔧 After normalization: ${validLinks.length} unique links`);

    // Apply include/exclude filters from metadata
    const includePaths = metadata?.include_paths ? metadata.include_paths.split('\n').filter(p => p.trim()) : [];
    const excludePaths = metadata?.exclude_paths ? metadata.exclude_paths.split('\n').filter(p => p.trim()) : [];

    if (includePaths.length > 0) {
      validLinks = validLinks.filter(link => 
        includePaths.some((pattern: string) => 
          link.includes(pattern.trim())
        )
      );
      console.log(`🔍 Applied include filters, ${validLinks.length} links remaining`);
    }

    if (excludePaths.length > 0) {
      validLinks = validLinks.filter(link => 
        !excludePaths.some((pattern: string) => 
          link.includes(pattern.trim())
        )
      );
      console.log(`🚫 Applied exclude filters, ${validLinks.length} links remaining`);
    }

    console.log(`📊 Final result: ${validLinks.length} quality frontend links`);
    return validLinks;
    
  } catch (error) {
    console.error('❌ Error discovering links:', error);
    return [];
  }
}

serve(async (req) => {
  console.log(`📥 ${req.method} request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source_id, url, crawl_type } = await req.json();
    
    console.log('📝 Received crawl request:', { source_id, url, crawl_type });

    if (!source_id || !url || !crawl_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: source_id, url, crawl_type' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Start recursive crawling in the background
    recursiveCrawlWebsite(source_id, url, crawl_type).catch(error => {
      console.error('🔥 Uncaught crawl error:', error);
    });

    return new Response(
      JSON.stringify({ 
        message: 'Crawling started successfully',
        source_id,
        url,
        crawl_type 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in crawl-website function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
