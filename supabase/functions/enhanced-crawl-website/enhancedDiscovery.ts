
/**
 * Enhanced URL Discovery Module
 * Implements comprehensive link extraction and filtering for maximum page discovery
 */

// URL normalization and validation
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Lowercase hostname
    urlObj.hostname = urlObj.hostname.toLowerCase();
    
    // Remove tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', '_ga', '_gl'];
    trackingParams.forEach(param => urlObj.searchParams.delete(param));
    
    // Remove trailing slash from pathname (except root)
    if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    // Remove fragment
    urlObj.hash = '';
    
    return urlObj.toString();
  } catch (error) {
    console.warn(`Failed to normalize URL: ${url}`, error);
    return url;
  }
}

// Enhanced link extraction - gets ALL links from HTML
export function extractAllLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  
  try {
    // Extract all href attributes from anchor tags
    const linkRegex = /<a[^>]*\s+href\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const fullLinkHtml = match[0];
      
      // Skip empty or fragment-only links
      if (!href || href === '#' || href.startsWith('#')) continue;
      
      // Skip if link appears to be hidden
      if (isHiddenLink(fullLinkHtml)) continue;
      
      // Resolve to absolute URL
      const absoluteUrl = resolveUrl(href, baseUrl);
      if (absoluteUrl) {
        const normalized = normalizeUrl(absoluteUrl);
        links.add(normalized);
      }
    }
  } catch (error) {
    console.error('Error extracting links:', error);
  }
  
  return Array.from(links);
}

// Check if a link is hidden using various CSS and HTML indicators
function isHiddenLink(linkHtml: string): boolean {
  // Check for hidden CSS properties in style attribute
  const hiddenStylePatterns = [
    /style\s*=\s*["'][^"']*display\s*:\s*none/i,
    /style\s*=\s*["'][^"']*visibility\s*:\s*hidden/i,
  ];
  
  for (const pattern of hiddenStylePatterns) {
    if (pattern.test(linkHtml)) return true;
  }
  
  // Check for hidden classes
  const hiddenClassPatterns = [
    /class\s*=\s*["'][^"']*\bhidden\b/i,
    /class\s*=\s*["'][^"']*\bsr-only\b/i,
    /class\s*=\s*["'][^"']*\bvisually-hidden\b/i,
    /class\s*=\s*["'][^"']*\bscreen-reader-only\b/i,
  ];
  
  for (const pattern of hiddenClassPatterns) {
    if (pattern.test(linkHtml)) return true;
  }
  
  // Check for aria-hidden
  if (/aria-hidden\s*=\s*["']true["']/i.test(linkHtml)) return true;
  
  return false;
}

// Resolve relative URLs to absolute URLs
function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    // If already absolute, validate and return
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return new URL(href).toString();
    }
    
    // Handle protocol-relative URLs
    if (href.startsWith('//')) {
      const base = new URL(baseUrl);
      return `${base.protocol}${href}`;
    }
    
    // Resolve relative URLs
    const resolved = new URL(href, baseUrl);
    return resolved.toString();
  } catch (error) {
    console.warn(`Failed to resolve URL: ${href} with base: ${baseUrl}`, error);
    return null;
  }
}

// Enhanced URL filtering system
export interface UrlFilterConfig {
  includePatterns: RegExp[];
  excludePatterns: RegExp[];
  requireSameDomain: boolean;
  baseDomain: string;
}

export function createDefaultFilterConfig(baseUrl: string): UrlFilterConfig {
  const baseDomain = new URL(baseUrl).hostname.toLowerCase();
  
  // Targeted exclude patterns - only true non-content
  const excludePatterns = [
    /^[^?]*\/feed\/?(\?.*)?$/i,              // RSS feeds
    /^[^?]*\/comments\/feed\/?(\?.*)?$/i,    // Comment feeds
    /^[^?]*\.(js|css|png|jpg|jpeg|gif|svg|ico|pdf|zip|doc|docx|xls|xlsx)(\?.*)?$/i, // Assets
    /^[^?]*\/wp-admin\//i,                   // WordPress admin
    /^[^?]*\/wp-json\//i,                    // WordPress API
    /^[^?]*\/api\//i,                        // Generic API endpoints
    /^[^?]*\/admin\//i,                      // Admin sections
    /^[^?]*\/login(\?.*)?$/i,                // Login pages
    /^[^?]*\/logout(\?.*)?$/i,               // Logout pages
    /^[^?]*\/xmlrpc\.php/i,                  // WordPress XML-RPC
  ];
  
  // Include patterns for greatpeople.no and similar sites
  const includePatterns = [
    /^[^?]*\/$/, // Homepage and directory pages
    /^[^?]*\/en\//i, // English section
    /^[^?]*\/no\//i, // Norwegian section
    /^[^?]*\/radgivere\//i, // Advisor profiles
    /^[^?]*\/employee-category\//i, // Team categories
    /^[^?]*\/projects-engineering/i, // Projects
    /^[^?]*\/tjenester\//i, // Services
    /^[^?]*\/rekruttere/i, // Recruitment
    /^[^?]*\/leie/i, // Rental/hiring
    /^[^?]*\/page\/\d+/i, // Pagination
    /^[^?]*\/\d{4}\/\d{2}\//i, // Date-based URLs
    /^[^?]*\/category\//i, // Categories
    /^[^?]*\/tag\//i, // Tags
    /^[^?]*\/about/i, // About pages
    /^[^?]*\/contact/i, // Contact pages
  ];
  
  return {
    includePatterns,
    excludePatterns,
    requireSameDomain: true,
    baseDomain
  };
}

export function shouldIncludeUrl(url: string, config: UrlFilterConfig): boolean {
  try {
    const urlObj = new URL(url);
    
    // Same domain check
    if (config.requireSameDomain && urlObj.hostname.toLowerCase() !== config.baseDomain) {
      return false;
    }
    
    const fullUrl = url.toLowerCase();
    
    // Check excludes first
    for (const exclude of config.excludePatterns) {
      if (exclude.test(fullUrl)) {
        console.log(`❌ Excluding URL: ${url} (matched exclude pattern)`);
        return false;
      }
    }
    
    // If no include patterns, allow everything not excluded
    if (config.includePatterns.length === 0) {
      console.log(`✅ Including URL: ${url} (no include patterns specified)`);
      return true;
    }
    
    // Check includes
    for (const include of config.includePatterns) {
      if (include.test(fullUrl)) {
        console.log(`✅ Including URL: ${url} (matched include pattern)`);
        return true;
      }
    }
    
    console.log(`⚠️ Excluding URL: ${url} (no include pattern matched)`);
    return false;
  } catch (error) {
    console.warn(`Invalid URL for filtering: ${url}`, error);
    return false;
  }
}

// Enhanced sitemap processing with sitemap index support
export async function discoverFromSitemap(
  sitemapUrl: string,
  filterConfig: UrlFilterConfig
): Promise<string[]> {
  const discoveredUrls = new Set<string>();
  
  try {
    console.log('🗺️ Starting enhanced sitemap discovery:', sitemapUrl);
    
    // Try to fetch sitemap
    let actualSitemapUrl = sitemapUrl;
    if (!sitemapUrl.includes('sitemap')) {
      const baseUrl = new URL(sitemapUrl);
      actualSitemapUrl = `${baseUrl.protocol}//${baseUrl.hostname}/sitemap.xml`;
    }
    
    await processSitemap(actualSitemapUrl, discoveredUrls, filterConfig);
    
    console.log(`✅ Sitemap discovery completed: ${discoveredUrls.size} URLs found`);
    return Array.from(discoveredUrls);
    
  } catch (error) {
    console.error('❌ Sitemap discovery failed:', error);
    return [];
  }
}

async function processSitemap(
  sitemapUrl: string,
  discoveredUrls: Set<string>,
  filterConfig: UrlFilterConfig,
  depth: number = 0
): Promise<void> {
  if (depth > 3) { // Prevent infinite recursion
    console.warn('Max sitemap depth reached');
    return;
  }
  
  try {
    console.log(`📊 Processing sitemap (depth ${depth}):`, sitemapUrl);
    
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.warn(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
      return;
    }

    const xmlText = await response.text();
    
    // Check if this is a sitemap index
    if (xmlText.includes('<sitemapindex')) {
      console.log('📑 Processing sitemap index');
      const childSitemaps = extractSitemapLocations(xmlText);
      
      // Process each child sitemap recursively
      for (const childSitemapUrl of childSitemaps) {
        await processSitemap(childSitemapUrl, discoveredUrls, filterConfig, depth + 1);
      }
    } else {
      console.log('📄 Processing regular sitemap');
      const urls = extractUrlLocations(xmlText);
      
      // Filter and add URLs
      for (const url of urls) {
        const normalized = normalizeUrl(url);
        if (shouldIncludeUrl(normalized, filterConfig)) {
          discoveredUrls.add(normalized);
        }
      }
    }
    
  } catch (error) {
    console.error(`Error processing sitemap ${sitemapUrl}:`, error);
  }
}

function extractSitemapLocations(xmlText: string): string[] {
  const sitemaps: string[] = [];
  const sitemapRegex = /<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g;
  
  let match;
  while ((match = sitemapRegex.exec(xmlText)) !== null) {
    const url = match[1].trim();
    if (url && url.startsWith('http')) {
      sitemaps.push(url);
    }
  }
  
  console.log(`Found ${sitemaps.length} child sitemaps`);
  return sitemaps;
}

function extractUrlLocations(xmlText: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  
  let match;
  while ((match = locRegex.exec(xmlText)) !== null) {
    const url = match[1].trim();
    if (url && url.startsWith('http')) {
      urls.push(url);
    }
  }
  
  console.log(`Extracted ${urls.length} URLs from sitemap`);
  return urls;
}

// Enhanced full website discovery
export async function discoverFromWebsite(
  url: string,
  filterConfig: UrlFilterConfig,
  maxPages: number = 200
): Promise<string[]> {
  const discoveredUrls = new Set<string>([normalizeUrl(url)]);
  const processedUrls = new Set<string>();
  const urlQueue = [normalizeUrl(url)];
  
  console.log('🔍 Starting enhanced website discovery:', url);
  
  while (urlQueue.length > 0 && discoveredUrls.size < maxPages) {
    const currentUrl = urlQueue.shift()!;
    
    if (processedUrls.has(currentUrl)) continue;
    processedUrls.add(currentUrl);
    
    try {
      console.log(`🔗 Processing page ${processedUrls.size}/${maxPages}: ${currentUrl}`);
      
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        console.warn(`Failed to fetch ${currentUrl}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      const pageLinks = extractAllLinks(html, currentUrl);
      
      console.log(`Found ${pageLinks.length} links on ${currentUrl}`);
      
      // Filter and add new URLs
      let newUrlsAdded = 0;
      for (const link of pageLinks) {
        const normalized = normalizeUrl(link);
        
        if (!discoveredUrls.has(normalized) && shouldIncludeUrl(normalized, filterConfig)) {
          discoveredUrls.add(normalized);
          
          // Add to queue for further crawling if we haven't reached the limit
          if (discoveredUrls.size < maxPages && !processedUrls.has(normalized)) {
            urlQueue.push(normalized);
            newUrlsAdded++;
          }
        }
      }
      
      console.log(`Added ${newUrlsAdded} new URLs to queue`);
      
      // Brief pause to be respectful
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error processing ${currentUrl}:`, error);
    }
  }
  
  console.log(`✅ Website discovery completed: ${discoveredUrls.size} URLs found`);
  return Array.from(discoveredUrls);
}
