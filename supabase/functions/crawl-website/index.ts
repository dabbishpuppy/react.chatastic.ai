import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Import our modules
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

// Configurable crawl limits
const DEFAULT_MAX_PAGES = parseInt(Deno.env.get('MAX_CRAWL_PAGES') || '1000');
const DEFAULT_MAX_DEPTH = parseInt(Deno.env.get('MAX_CRAWL_DEPTH') || '10');
const DEFAULT_CONCURRENCY = parseInt(Deno.env.get('CRAWL_CONCURRENCY') || '10');

// Track shutdown state
let isShuttingDown = false;

// Handle graceful shutdown
addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown due to:', ev.detail?.reason);
  isShuttingDown = true;
});

// Enhanced recursive crawling function with real-time progress updates
async function recursiveCrawlWebsite(sourceId: string, url: string, crawlType: string) {
  console.log(`🕷️ Starting enhanced crawl for ${url} with type ${crawlType}`);
  
  try {
    const normalizedUrl = normalizeUrl(url);
    console.log(`🔧 Normalized URL: ${normalizedUrl}`);
    
    await updateSourceProgress(sourceId, 'in_progress', 0, 0, 0);

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

    // Parse include/exclude patterns and crawl settings from metadata
    const includePatterns = parsePatterns(source.metadata?.include_paths || '');
    const excludePatterns = parsePatterns(source.metadata?.exclude_paths || '');
    const maxPages = source.metadata?.max_pages || DEFAULT_MAX_PAGES;
    const maxDepth = source.metadata?.max_depth || DEFAULT_MAX_DEPTH;
    const concurrency = source.metadata?.concurrency || DEFAULT_CONCURRENCY;
    
    console.log(`📋 Settings: maxPages=${maxPages}, maxDepth=${maxDepth}, concurrency=${concurrency}`);
    console.log(`📋 Include patterns: ${includePatterns.length}, Exclude patterns: ${excludePatterns.length}`);

    const discoveredUrls = new Set<string>();
    const crawlStats = {
      pagesVisited: 0,
      linksFound: 0,
      linksFiltered: 0,
      filterReasons: {},
      maxPagesReached: false,
      maxDepthReached: false,
      completionReason: 'completed'
    };

    if (crawlType === 'individual-link') {
      console.log(`📄 Processing individual link: ${normalizedUrl}`);
      const validation = isCustomerFacingUrl(normalizedUrl, baseDomain);
      if (validation.valid) {
        discoveredUrls.add(normalizedUrl);
        await updateSourceProgress(sourceId, 'in_progress', 50, 1, maxPages);
      } else {
        console.log(`❌ Individual link failed validation: ${validation.reason}`);
      }
    } else if (crawlType === 'sitemap') {
      console.log(`🗺️ Fetching sitemap from: ${normalizedUrl}`);
      await updateSourceProgress(sourceId, 'in_progress', 20, 0, maxPages);
      
      const sitemapUrls = await fetchSitemapLinks(normalizedUrl);
      
      // Apply filtering to sitemap URLs
      const filterResults = filterUrls(sitemapUrls, baseDomain, includePatterns, excludePatterns);
      
      // Apply page limit to sitemap results
      const limitedUrls = filterResults.valid.slice(0, maxPages);
      limitedUrls.forEach(url => discoveredUrls.add(url));
      
      if (filterResults.valid.length > maxPages) {
        crawlStats.maxPagesReached = true;
        crawlStats.completionReason = 'max_pages_reached';
      }
      
      console.log(`✅ Sitemap: ${limitedUrls.length} valid (limited from ${filterResults.valid.length}), ${filterResults.stats.total - filterResults.stats.validCount} filtered`);
      Object.assign(crawlStats, filterResults.stats);
      
      await updateSourceProgress(sourceId, 'in_progress', 70, discoveredUrls.size, maxPages);
    } else {
      console.log(`🔍 Starting enhanced recursive crawl from: ${normalizedUrl}`);
      await enhancedRecursiveCrawlWithConcurrency(
        sourceId,
        normalizedUrl, 
        baseDomain, 
        includePatterns, 
        excludePatterns,
        discoveredUrls, 
        crawlStats,
        0, 
        maxDepth,
        maxPages,
        concurrency
      );
    }

    if (isShuttingDown) {
      console.log('⚠️ Function is shutting down, saving progress...');
      await updateSourceProgress(sourceId, 'pending', 50, discoveredUrls.size, maxPages);
      return;
    }

    console.log(`✅ Discovery complete: ${discoveredUrls.size} valid URLs found`);
    console.log(`📊 Crawl stats:`, crawlStats);

    await updateSourceProgress(sourceId, 'in_progress', 80, discoveredUrls.size, maxPages);

    // Create child sources for valid URLs
    if (discoveredUrls.size > 0) {
      console.log(`📝 Creating ${discoveredUrls.size} child sources`);
      const urlsArray = Array.from(discoveredUrls);
      
      const batchSize = 100;
      for (let i = 0; i < urlsArray.length; i += batchSize) {
        if (isShuttingDown) {
          console.log('⚠️ Shutdown detected during child source creation');
          break;
        }

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

        const progressPercent = Math.min(80 + (i / urlsArray.length) * 15, 95);
        await updateSourceProgress(sourceId, 'in_progress', Math.round(progressPercent), discoveredUrls.size, maxPages);
      }
    }

    const finalStatus = isShuttingDown ? 'pending' : 'completed';
    const finalProgress = isShuttingDown ? 50 : 100;
    
    await supabase
      .from('agent_sources')
      .update({ 
        crawl_status: finalStatus,
        progress: finalProgress,
        links_count: discoveredUrls.size,
        last_crawled_at: new Date().toISOString(),
        metadata: {
          ...source.metadata,
          crawl_stats: crawlStats,
          completion_summary: {
            total_urls: discoveredUrls.size,
            completion_time: new Date().toISOString(),
            completion_reason: isShuttingDown ? 'function_shutdown' : crawlStats.completionReason,
            max_pages: maxPages,
            pages_crawled: discoveredUrls.size
          }
        }
      })
      .eq('id', sourceId);

    const statusMessage = isShuttingDown ? 
      `⚠️ Crawl paused due to function shutdown for ${normalizedUrl} - found ${discoveredUrls.size} URLs` :
      `✅ Enhanced crawl completed for ${normalizedUrl} - found ${discoveredUrls.size} customer-facing URLs`;
    
    console.log(statusMessage);
    
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

// Helper function to update source progress with detailed info
async function updateSourceProgress(sourceId: string, status: string, progress: number, currentCount: number, maxPages: number): Promise<void> {
  const { error } = await supabase
    .from('agent_sources')
    .update({
      crawl_status: status,
      progress,
      links_count: currentCount,
      metadata: {
        current_crawled: currentCount,
        max_pages: maxPages,
        last_progress_update: new Date().toISOString()
      }
    })
    .eq('id', sourceId);

  if (error) {
    console.error('Error updating progress:', error);
  } else {
    console.log(`📊 Progress update: ${status} ${progress}% (${currentCount}/${maxPages})`);
  }
}

// Enhanced recursive crawl with concurrency control and real-time progress
async function enhancedRecursiveCrawlWithConcurrency(
  sourceId: string,
  startUrl: string,
  baseDomain: string,
  includePatterns: string[],
  excludePatterns: string[],
  discoveredUrls: Set<string>,
  crawlStats: any,
  currentDepth: number,
  maxDepth: number,
  maxPages: number,
  concurrency: number
): Promise<void> {
  const urlQueue: Array<{url: string, depth: number}> = [{url: startUrl, depth: 0}];
  const processingUrls = new Set<string>();
  const processedUrls = new Set<string>();
  
  console.log(`🚀 Starting concurrent crawl: maxDepth=${maxDepth}, maxPages=${maxPages}, concurrency=${concurrency}`);

  while (urlQueue.length > 0 && discoveredUrls.size < maxPages && !isShuttingDown) {
    // Take up to 'concurrency' URLs from the queue
    const currentBatch = urlQueue.splice(0, concurrency);
    
    // Process batch concurrently
    const batchPromises = currentBatch.map(async ({url, depth}) => {
      if (processingUrls.has(url) || processedUrls.has(url) || depth > maxDepth || isShuttingDown) {
        if (depth > maxDepth) {
          crawlStats.maxDepthReached = true;
        }
        return [];
      }
      
      processingUrls.add(url);
      
      try {
        const newUrls = await crawlSinglePage(url, baseDomain, includePatterns, excludePatterns, crawlStats);
        processedUrls.add(url);
        processingUrls.delete(url);
        
        // Add new URLs to discovered set and queue for next depth
        const validNewUrls: Array<{url: string, depth: number}> = [];
        for (const newUrl of newUrls) {
          if (!discoveredUrls.has(newUrl) && !processedUrls.has(newUrl) && !processingUrls.has(newUrl)) {
            discoveredUrls.add(newUrl);
            if (depth + 1 <= maxDepth && discoveredUrls.size < maxPages) {
              validNewUrls.push({url: newUrl, depth: depth + 1});
            }
          }
        }
        
        // Update progress every few pages
        if (discoveredUrls.size % 5 === 0) {
          const progressPercent = Math.min((discoveredUrls.size / maxPages) * 70, 70);
          await updateSourceProgress(sourceId, 'in_progress', Math.round(progressPercent), discoveredUrls.size, maxPages);
        }
        
        return validNewUrls;
      } catch (error) {
        console.error(`❌ Error crawling ${url}:`, error);
        processedUrls.add(url);
        processingUrls.delete(url);
        return [];
      }
    });
    
    // Wait for batch to complete and add new URLs to queue
    const batchResults = await Promise.all(batchPromises);
    for (const newUrls of batchResults) {
      urlQueue.push(...newUrls);
    }
    
    // Check if we've hit our limits
    if (discoveredUrls.size >= maxPages) {
      crawlStats.maxPagesReached = true;
      crawlStats.completionReason = 'max_pages_reached';
      break;
    }
    
    // Rate limiting between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (isShuttingDown) {
    crawlStats.completionReason = 'function_shutdown';
  } else if (urlQueue.length === 0) {
    crawlStats.completionReason = 'all_pages_crawled';
  }
  
  console.log(`🏁 Crawl finished: ${discoveredUrls.size} URLs, reason: ${crawlStats.completionReason}`);
}

// Single page crawling function
async function crawlSinglePage(
  url: string,
  baseDomain: string,
  includePatterns: string[],
  excludePatterns: string[],
  crawlStats: any
): Promise<string[]> {
  console.log(`🔍 Crawling: ${url}`);
  crawlStats.pagesVisited++;

  try {
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
    
    console.log(`🔗 Found ${allLinks.length} potential links`);
    
    // Apply comprehensive filtering
    const filterResults = filterUrls(allLinks, baseDomain, includePatterns, excludePatterns);
    
    // Track filtering statistics
    crawlStats.linksFiltered += filterResults.filtered.length;
    filterResults.filtered.forEach(filtered => {
      const reason = filtered.reason;
      crawlStats.filterReasons[reason] = (crawlStats.filterReasons[reason] || 0) + 1;
    });
    
    console.log(`✅ Found ${filterResults.valid.length} valid URLs, filtered ${filterResults.filtered.length}`);
    
    return filterResults.valid;
    
  } catch (error) {
    console.error(`❌ Error crawling ${url}:`, error);
    return [];
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
    const { source_id, url, crawl_type, max_pages, max_depth, concurrency } = await req.json();
    
    console.log('📝 Received enhanced crawl request:', { 
      source_id, 
      url, 
      crawl_type, 
      max_pages: max_pages || DEFAULT_MAX_PAGES,
      max_depth: max_depth || DEFAULT_MAX_DEPTH,
      concurrency: concurrency || DEFAULT_CONCURRENCY
    });

    if (!source_id || !url || !crawl_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: source_id, url, crawl_type' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update source metadata with crawl settings if provided
    if (max_pages || max_depth || concurrency) {
      const { data: source } = await supabase
        .from('agent_sources')
        .select('metadata')
        .eq('id', source_id)
        .single();

      if (source) {
        const updatedMetadata = {
          ...source.metadata,
          max_pages: max_pages || DEFAULT_MAX_PAGES,
          max_depth: max_depth || DEFAULT_MAX_DEPTH,
          concurrency: concurrency || DEFAULT_CONCURRENCY
        };

        await supabase
          .from('agent_sources')
          .update({ metadata: updatedMetadata })
          .eq('id', source_id);
      }
    }

    // Use EdgeRuntime.waitUntil to prevent premature shutdown
    const crawlPromise = recursiveCrawlWebsite(source_id, url, crawl_type);
    
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(crawlPromise);
    } else {
      // Fallback for environments without EdgeRuntime
      crawlPromise.catch(error => {
        console.error('🔥 Uncaught enhanced crawl error:', error);
      });
    }

    return new Response(
      JSON.stringify({ 
        message: 'Enhanced crawling started successfully',
        source_id,
        url: normalizeUrl(url),
        crawl_type,
        settings: {
          max_pages: max_pages || DEFAULT_MAX_PAGES,
          max_depth: max_depth || DEFAULT_MAX_DEPTH,
          concurrency: concurrency || DEFAULT_CONCURRENCY
        },
        features: [
          'Customer-facing link extraction',
          'Semantic HTML parsing',
          'Configurable limits and concurrency',
          'Advanced filtering',
          'Real-time progress tracking',
          'Graceful shutdown handling'
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
