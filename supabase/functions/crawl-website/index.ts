
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Import our new modules
import { extractFrontEndLinks, extractNavigationLinks } from './modules/linkExtractor.js';
import { matchesIncludePatterns, matchesExcludePatterns, parsePatterns } from './modules/patternMatcher.js';
import { isCustomerFacingUrl, filterUrls, normalizeUrl, extractDomain } from './modules/urlValidator.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Enhanced recursive crawling function with improved filtering
async function recursiveCrawlWebsite(sourceId: string, url: string, crawlType: string) {
  console.log(`🕷️ Starting enhanced crawl for ${url} with type ${crawlType}`);
  
  try {
    const normalizedUrl = normalizeUrl(url);
    console.log(`🔧 Normalized URL: ${normalizedUrl}`);
    
    await supabase
      .from('agent_sources')
      .update({ 
        crawl_status: 'in_progress', 
        progress: 10,
        last_crawled_at: new Date().toISOString(),
        url: normalizedUrl
      })
      .eq('id', sourceId);

    const { data: source, error: sourceError } = await supabase
      .from('agent_sources')
      .select('agent_id, team_id, metadata')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      throw new Error(`Source not found: ${sourceError?.message}`);
    }

    console.log(`📊 Source found: agent_id=${source.agent_id}, team_id=${source.team_id}`);

    const baseDomain = extractDomain(normalizedUrl);
    console.log(`🌐 Base domain: ${baseDomain}`);

    if (!baseDomain) {
      throw new Error(`Invalid domain extracted from URL: ${normalizedUrl}`);
    }

    // Parse include/exclude patterns from metadata
    const includePatterns = parsePatterns(source.metadata?.include_paths || '');
    const excludePatterns = parsePatterns(source.metadata?.exclude_paths || '');
    
    console.log(`📋 Include patterns: ${includePatterns.length}, Exclude patterns: ${excludePatterns.length}`);

    const discoveredUrls = new Set<string>();
    const crawlStats = {
      pagesVisited: 0,
      linksFound: 0,
      linksFiltered: 0,
      filterReasons: {}
    };

    if (crawlType === 'individual-link') {
      console.log(`📄 Processing individual link: ${normalizedUrl}`);
      const validation = isCustomerFacingUrl(normalizedUrl, baseDomain);
      if (validation.valid) {
        discoveredUrls.add(normalizedUrl);
      } else {
        console.log(`❌ Individual link failed validation: ${validation.reason}`);
      }
    } else if (crawlType === 'sitemap') {
      console.log(`🗺️ Fetching sitemap from: ${normalizedUrl}`);
      const sitemapUrls = await fetchSitemapLinks(normalizedUrl);
      
      // Apply filtering to sitemap URLs
      const filterResults = filterUrls(sitemapUrls, baseDomain, includePatterns, excludePatterns);
      filterResults.valid.forEach(url => discoveredUrls.add(url));
      
      console.log(`✅ Sitemap: ${filterResults.stats.validCount} valid, ${filterResults.stats.total - filterResults.stats.validCount} filtered`);
      Object.assign(crawlStats, filterResults.stats);
    } else {
      console.log(`🔍 Starting enhanced recursive crawl from: ${normalizedUrl}`);
      await enhancedRecursiveCrawl(
        normalizedUrl, 
        baseDomain, 
        includePatterns, 
        excludePatterns,
        discoveredUrls, 
        crawlStats,
        0, 
        3 // Reduced max depth for better quality
      );
    }

    console.log(`✅ Discovery complete: ${discoveredUrls.size} valid URLs found`);
    console.log(`📊 Crawl stats:`, crawlStats);

    await supabase
      .from('agent_sources')
      .update({ 
        progress: 50,
        links_count: discoveredUrls.size,
        metadata: {
          ...source.metadata,
          crawl_stats: crawlStats,
          last_crawl_summary: {
            urls_discovered: discoveredUrls.size,
            pages_visited: crawlStats.pagesVisited,
            links_filtered: crawlStats.linksFiltered
          }
        }
      })
      .eq('id', sourceId);

    // Create child sources for valid URLs
    if (discoveredUrls.size > 0) {
      console.log(`📝 Creating ${discoveredUrls.size} child sources`);
      const urlsArray = Array.from(discoveredUrls);
      
      const batchSize = 100;
      for (let i = 0; i < urlsArray.length; i += batchSize) {
        const batch = urlsArray.slice(i, i + batchSize);
        const childSources = batch.map(link => ({
          agent_id: source.agent_id,
          team_id: source.team_id,
          source_type: 'website' as const,
          title: link,
          url: link,
          parent_source_id: sourceId,
          crawl_status: 'completed',
          metadata: {
            crawl_type: 'individual-link',
            parent_url: normalizedUrl,
            discovered_at: new Date().toISOString(),
            validation_passed: true
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

        const progressPercent = Math.min(50 + (i / urlsArray.length) * 40, 90);
        await supabase
          .from('agent_sources')
          .update({ progress: Math.round(progressPercent) })
          .eq('id', sourceId);
      }
    }

    await supabase
      .from('agent_sources')
      .update({ 
        crawl_status: 'completed',
        progress: 100,
        links_count: discoveredUrls.size,
        last_crawled_at: new Date().toISOString(),
        metadata: {
          ...source.metadata,
          crawl_stats: crawlStats,
          completion_summary: {
            total_urls: discoveredUrls.size,
            completion_time: new Date().toISOString()
          }
        }
      })
      .eq('id', sourceId);

    console.log(`✅ Enhanced crawl completed for ${normalizedUrl} - found ${discoveredUrls.size} customer-facing URLs`);
    
  } catch (error) {
    console.error(`❌ Crawl failed for ${url}:`, error);
    
    await supabase
      .from('agent_sources')
      .update({ 
        crawl_status: 'failed',
        metadata: {
          error: error.message,
          failed_at: new Date().toISOString()
        }
      })
      .eq('id', sourceId);
  }
}

// Enhanced recursive crawl with improved link discovery and filtering
async function enhancedRecursiveCrawl(
  url: string,
  baseDomain: string,
  includePatterns: string[],
  excludePatterns: string[],
  discoveredUrls: Set<string>,
  crawlStats: any,
  currentDepth: number,
  maxDepth: number
): Promise<void> {
  if (currentDepth > maxDepth) {
    console.log(`🛑 Max depth ${maxDepth} reached at ${url}`);
    return;
  }

  console.log(`🔍 Enhanced crawling depth ${currentDepth}: ${url}`);
  crawlStats.pagesVisited++;

  try {
    // Fetch page content with enhanced headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CustomerPageCrawler/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`📄 Fetched ${html.length} characters from ${url}`);
    
    // Extract customer-facing links using enhanced extraction
    const extractedLinks = extractFrontEndLinks(html, url);
    const navLinks = extractNavigationLinks(html, url);
    
    // Combine and deduplicate links
    const allLinks = [...new Set([...extractedLinks, ...navLinks])];
    crawlStats.linksFound += allLinks.length;
    
    console.log(`🔗 Found ${allLinks.length} potential links (${extractedLinks.length} content + ${navLinks.length} navigation)`);
    
    // Apply comprehensive filtering
    const filterResults = filterUrls(allLinks, baseDomain, includePatterns, excludePatterns);
    
    // Add valid URLs to discovered set
    filterResults.valid.forEach(link => discoveredUrls.add(link));
    
    // Track filtering statistics
    crawlStats.linksFiltered += filterResults.filtered.length;
    filterResults.filtered.forEach(filtered => {
      const reason = filtered.reason;
      crawlStats.filterReasons[reason] = (crawlStats.filterReasons[reason] || 0) + 1;
    });
    
    console.log(`✅ Added ${filterResults.valid.length} valid URLs, filtered ${filterResults.filtered.length}`);
    
    // Recursively crawl a subset of valid URLs for deeper discovery
    if (currentDepth < maxDepth) {
      const urlsToRecurse = filterResults.valid
        .filter(link => !discoveredUrls.has(link)) // Only crawl new URLs
        .slice(0, 10); // Limit to prevent explosion
      
      for (const link of urlsToRecurse) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        await enhancedRecursiveCrawl(
          link, 
          baseDomain, 
          includePatterns, 
          excludePatterns, 
          discoveredUrls, 
          crawlStats, 
          currentDepth + 1, 
          maxDepth
        );
      }
    }
    
  } catch (error) {
    console.error(`❌ Error crawling ${url}:`, error);
  }
}

// Enhanced sitemap processing
async function fetchSitemapLinks(sitemapUrl: string): Promise<string[]> {
  try {
    console.log(`🌐 Fetching sitemap from: ${sitemapUrl}`);
    const response = await fetch(sitemapUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const sitemapContent = await response.text();
    
    // Extract URLs from sitemap XML
    const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
    if (!urlMatches) {
      console.log('📄 No URLs found in sitemap');
      return [];
    }
    
    const urls = urlMatches
      .map(match => match.replace(/<\/?loc>/g, ''))
      .filter(url => url.startsWith('http'));
    
    console.log(`📊 Extracted ${urls.length} URLs from sitemap`);
    return urls;
  } catch (error) {
    console.error('❌ Error fetching sitemap:', error);
    return [];
  }
}

serve(async (req) => {
  console.log(`📥 ${req.method} request received`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source_id, url, crawl_type } = await req.json();
    
    console.log('📝 Received enhanced crawl request:', { source_id, url, crawl_type });

    if (!source_id || !url || !crawl_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: source_id, url, crawl_type' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Start enhanced crawling process
    recursiveCrawlWebsite(source_id, url, crawl_type).catch(error => {
      console.error('🔥 Uncaught enhanced crawl error:', error);
    });

    return new Response(
      JSON.stringify({ 
        message: 'Enhanced crawling started successfully',
        source_id,
        url: normalizeUrl(url),
        crawl_type,
        features: [
          'Customer-facing link extraction',
          'Semantic HTML parsing',
          'Advanced filtering',
          'Include/exclude pattern support'
        ]
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in enhanced crawl-website function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
