
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

// Reduced limits to prevent CPU timeouts
const DEFAULT_MAX_PAGES = parseInt(Deno.env.get('MAX_CRAWL_PAGES') || '100');
const DEFAULT_MAX_DEPTH = parseInt(Deno.env.get('MAX_CRAWL_DEPTH') || '3');
const DEFAULT_CONCURRENCY = parseInt(Deno.env.get('CRAWL_CONCURRENCY') || '2');

// Track shutdown state and CPU usage
let isShuttingDown = false;
let processedCount = 0;
const startTime = Date.now();

// Handle graceful shutdown
addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown due to:', ev.detail?.reason);
  isShuttingDown = true;
});

// CPU timeout prevention
function shouldStopForCPU(): boolean {
  const runTime = Date.now() - startTime;
  const avgTimePerPage = runTime / Math.max(processedCount, 1);
  const estimatedTimeRemaining = avgTimePerPage * 10; // For next 10 pages
  
  // Stop if we've been running for 140 seconds or if we estimate we'll timeout
  if (runTime > 140000 || runTime + estimatedTimeRemaining > 160000) {
    console.log(`🛑 Stopping to prevent CPU timeout. Runtime: ${runTime}ms, Processed: ${processedCount}`);
    return true;
  }
  return false;
}

// Enhanced recursive crawling function with immediate status updates and content size tracking
async function recursiveCrawlWebsite(sourceId: string, url: string, crawlType: string) {
  console.log(`🕷️ Starting enhanced crawl for ${url} with type ${crawlType}`);
  
  try {
    const normalizedUrl = normalizeUrl(url);
    console.log(`🔧 Normalized URL: ${normalizedUrl}`);
    
    // IMMEDIATELY update status to in_progress
    await updateSourceProgress(sourceId, 'in_progress', 5, 0, 0, 0);

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
    const maxPages = Math.min(source.metadata?.max_pages || DEFAULT_MAX_PAGES, DEFAULT_MAX_PAGES);
    const maxDepth = Math.min(source.metadata?.max_depth || DEFAULT_MAX_DEPTH, DEFAULT_MAX_DEPTH);
    const concurrency = Math.min(source.metadata?.concurrency || DEFAULT_CONCURRENCY, DEFAULT_CONCURRENCY);
    
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
      completionReason: 'completed',
      totalSize: 0
    };

    // Update status again to confirm we're starting
    await updateSourceProgress(sourceId, 'in_progress', 10, 0, maxPages, 0);

    if (crawlType === 'individual-link') {
      console.log(`📄 Processing individual link: ${normalizedUrl}`);
      const validation = isCustomerFacingUrl(normalizedUrl, baseDomain);
      if (validation.valid) {
        // Fetch content for size calculation
        const content = await fetchPageContent(normalizedUrl);
        const contentSize = content ? new Blob([content]).size : 0;
        
        discoveredUrls.add(normalizedUrl);
        crawlStats.totalSize = contentSize;
        await updateSourceProgress(sourceId, 'in_progress', 50, 1, maxPages, contentSize);
        
        // Create child source with content
        await createChildSource(source, normalizedUrl, normalizedUrl, sourceId, content);
      } else {
        console.log(`❌ Individual link failed validation: ${validation.reason}`);
      }
    } else if (crawlType === 'sitemap') {
      console.log(`🗺️ Fetching sitemap from: ${normalizedUrl}`);
      await updateSourceProgress(sourceId, 'in_progress', 20, 0, maxPages, 0);
      
      const sitemapUrls = await fetchSitemapLinks(normalizedUrl);
      
      // Apply filtering to sitemap URLs
      const filterResults = filterUrls(sitemapUrls, baseDomain, includePatterns, excludePatterns);
      
      // Apply page limit to sitemap results
      const limitedUrls = filterResults.valid.slice(0, maxPages);
      
      // Process sitemap URLs in smaller batches
      let totalSize = 0;
      for (let i = 0; i < limitedUrls.length && !isShuttingDown && !shouldStopForCPU(); i += 5) {
        const batch = limitedUrls.slice(i, i + 5);
        
        for (const url of batch) {
          if (isShuttingDown || shouldStopForCPU()) break;
          
          const content = await fetchPageContent(url);
          const contentSize = content ? new Blob([content]).size : 0;
          totalSize += contentSize;
          
          discoveredUrls.add(url);
          await createChildSource(source, url, normalizedUrl, sourceId, content);
          
          const progress = Math.min(20 + (i / limitedUrls.length) * 60, 80);
          await updateSourceProgress(sourceId, 'in_progress', Math.round(progress), discoveredUrls.size, maxPages, totalSize);
        }
      }
      
      crawlStats.totalSize = totalSize;
      
      if (filterResults.valid.length > maxPages) {
        crawlStats.maxPagesReached = true;
        crawlStats.completionReason = 'max_pages_reached';
      }
      
      console.log(`✅ Sitemap: ${discoveredUrls.size} processed, total size: ${totalSize} bytes`);
      Object.assign(crawlStats, filterResults.stats);
      
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
        concurrency,
        source
      );
    }

    if (isShuttingDown || shouldStopForCPU()) {
      console.log('⚠️ Function stopping early, saving progress...');
      await updateSourceProgress(sourceId, 'pending', 50, discoveredUrls.size, maxPages, crawlStats.totalSize);
      return;
    }

    console.log(`✅ Discovery complete: ${discoveredUrls.size} valid URLs found, total size: ${crawlStats.totalSize} bytes`);
    console.log(`📊 Crawl stats:`, crawlStats);

    const finalStatus = isShuttingDown || shouldStopForCPU() ? 'pending' : 'completed';
    const finalProgress = isShuttingDown || shouldStopForCPU() ? 50 : 100;
    
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
          total_content_size: crawlStats.totalSize,
          completion_summary: {
            total_urls: discoveredUrls.size,
            completion_time: new Date().toISOString(),
            completion_reason: isShuttingDown || shouldStopForCPU() ? 'function_resource_limit' : crawlStats.completionReason,
            max_pages: maxPages,
            pages_crawled: discoveredUrls.size,
            total_size: crawlStats.totalSize
          }
        }
      })
      .eq('id', sourceId);

    const statusMessage = finalStatus === 'pending' ? 
      `⚠️ Crawl paused due to resource limits for ${normalizedUrl} - found ${discoveredUrls.size} URLs (${(crawlStats.totalSize / 1024).toFixed(1)}KB)` :
      `✅ Enhanced crawl completed for ${normalizedUrl} - found ${discoveredUrls.size} customer-facing URLs (${(crawlStats.totalSize / 1024).toFixed(1)}KB)`;
    
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

// Helper function to fetch page content
async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CustomerPageCrawler/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow'
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

// Helper function to create child source with content
async function createChildSource(source: any, url: string, parentUrl: string, parentSourceId: string, content: string | null): Promise<void> {
  try {
    const { error } = await supabase
      .from('agent_sources')
      .insert({
        agent_id: source.agent_id,
        team_id: source.team_id,
        source_type: 'website',
        title: url,
        url: url,
        content: content,
        parent_source_id: parentSourceId,
        crawl_status: 'completed',
        metadata: {
          crawl_type: 'individual-link',
          parent_url: parentUrl,
          discovered_at: new Date().toISOString(),
          validation_passed: true,
          content_size: content ? new Blob([content]).size : 0
        },
        created_by: null
      });

    if (error) {
      console.error(`❌ Error creating child source for ${url}:`, error);
    }
  } catch (error) {
    console.error(`❌ Error creating child source for ${url}:`, error);
  }
}

// Helper function to update source progress with content size
async function updateSourceProgress(sourceId: string, status: string, progress: number, currentCount: number, maxPages: number, totalSize: number): Promise<void> {
  const { error } = await supabase
    .from('agent_sources')
    .update({
      crawl_status: status,
      progress,
      links_count: currentCount,
      metadata: {
        current_crawled: currentCount,
        max_pages: maxPages,
        total_content_size: totalSize,
        last_progress_update: new Date().toISOString()
      }
    })
    .eq('id', sourceId);

  if (error) {
    console.error('Error updating progress:', error);
  } else {
    console.log(`📊 Progress update: ${status} ${progress}% (${currentCount}/${maxPages}) - ${(totalSize / 1024).toFixed(1)}KB`);
  }
}

// Enhanced recursive crawl with CPU timeout protection
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
  concurrency: number,
  source: any
): Promise<void> {
  const urlQueue: Array<{url: string, depth: number}> = [{url: startUrl, depth: 0}];
  const processingUrls = new Set<string>();
  const processedUrls = new Set<string>();
  
  console.log(`🚀 Starting concurrent crawl: maxDepth=${maxDepth}, maxPages=${maxPages}, concurrency=${concurrency}`);

  while (urlQueue.length > 0 && discoveredUrls.size < maxPages && !isShuttingDown && !shouldStopForCPU()) {
    // Take up to 'concurrency' URLs from the queue (reduced from original)
    const currentBatch = urlQueue.splice(0, Math.min(concurrency, 2));
    
    // Process batch concurrently
    const batchPromises = currentBatch.map(async ({url, depth}) => {
      if (processingUrls.has(url) || processedUrls.has(url) || depth > maxDepth || isShuttingDown || shouldStopForCPU()) {
        if (depth > maxDepth) {
          crawlStats.maxDepthReached = true;
        }
        return [];
      }
      
      processingUrls.add(url);
      processedCount++;
      
      try {
        const newUrls = await crawlSinglePage(url, baseDomain, includePatterns, excludePatterns, crawlStats, source, sourceId);
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
        
        // Update progress more frequently (every page)
        const progressPercent = Math.min(10 + (discoveredUrls.size / maxPages) * 60, 70);
        await updateSourceProgress(sourceId, 'in_progress', Math.round(progressPercent), discoveredUrls.size, maxPages, crawlStats.totalSize);
        
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
    
    // Longer rate limiting between batches to prevent CPU overload
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  if (isShuttingDown || shouldStopForCPU()) {
    crawlStats.completionReason = 'function_resource_limit';
  } else if (urlQueue.length === 0) {
    crawlStats.completionReason = 'all_pages_crawled';
  }
  
  console.log(`🏁 Crawl finished: ${discoveredUrls.size} URLs, reason: ${crawlStats.completionReason}, total size: ${(crawlStats.totalSize / 1024).toFixed(1)}KB`);
}

// Single page crawling function with content storage
async function crawlSinglePage(
  url: string,
  baseDomain: string,
  includePatterns: string[],
  excludePatterns: string[],
  crawlStats: any,
  source: any,
  parentSourceId: string
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
    const contentSize = new Blob([html]).size;
    crawlStats.totalSize = (crawlStats.totalSize || 0) + contentSize;
    
    console.log(`📄 Fetched ${html.length} characters (${(contentSize / 1024).toFixed(1)}KB) from ${url}`);
    
    // Create child source with content
    await createChildSource(source, url, url, parentSourceId, html);
    
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
      max_pages: Math.min(max_pages || DEFAULT_MAX_PAGES, DEFAULT_MAX_PAGES),
      max_depth: Math.min(max_depth || DEFAULT_MAX_DEPTH, DEFAULT_MAX_DEPTH),
      concurrency: Math.min(concurrency || DEFAULT_CONCURRENCY, DEFAULT_CONCURRENCY)
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

    // Update source metadata with reduced crawl settings if provided
    const finalMaxPages = Math.min(max_pages || DEFAULT_MAX_PAGES, DEFAULT_MAX_PAGES);
    const finalMaxDepth = Math.min(max_depth || DEFAULT_MAX_DEPTH, DEFAULT_MAX_DEPTH);
    const finalConcurrency = Math.min(concurrency || DEFAULT_CONCURRENCY, DEFAULT_CONCURRENCY);

    if (max_pages || max_depth || concurrency) {
      const { data: source } = await supabase
        .from('agent_sources')
        .select('metadata')
        .eq('id', source_id)
        .single();

      if (source) {
        const updatedMetadata = {
          ...source.metadata,
          max_pages: finalMaxPages,
          max_depth: finalMaxDepth,
          concurrency: finalConcurrency
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
          max_pages: finalMaxPages,
          max_depth: finalMaxDepth,
          concurrency: finalConcurrency
        },
        features: [
          'CPU timeout prevention',
          'Content size tracking',
          'Immediate status updates',
          'Customer-facing link extraction',
          'Frequent progress tracking',
          'Graceful shutdown handling',
          'Optimized batch processing'
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
