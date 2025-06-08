
// Enhanced URL discovery with comprehensive link extraction and smart filtering

interface DiscoveryConfig {
  excludePaths: string[];
  includePaths: string[];
  maxPages: number;
}

// Targeted exclusions for non-content URLs
const DEFAULT_EXCLUDES = [
  /^\/feed\/?$/i,              // RSS feeds
  /^\/comments\/feed\/?$/i,    // Comment feeds
  /#.+$/,                      // URL fragments
  /\.(js|css|scss|sass|less|map|woff|woff2|ttf|eot|otf)$/i,  // Assets
  /\.(jpg|jpeg|png|gif|svg|webp|ico|bmp|tiff|avif)$/i,       // Images
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|tar|gz)$/i,     // Documents
  /\.(json|xml|csv|txt|log)$/i,                               // Data files
  /\.(mp4|mp3|wav|avi|mov|webm|flv|mkv|wmv)$/i,              // Media
  /\/wp-admin\//i,             // WordPress admin
  /\/wp-content\//i,           // WordPress content
  /\/wp-json\//i,              // WordPress API
  /\/api\//i,                  // API endpoints
  /\/admin\//i,                // Admin areas
  /\/login/i,                  // Login pages
  /\/logout/i,                 // Logout pages
  /\/register/i,               // Registration pages
  /\/dashboard/i,              // Dashboards
  /\/search\?/i,               // Search results with query params
  /\/filter\?/i,               // Filter results with query params
];

// Universal include patterns that work for all websites
const UNIVERSAL_CONTENT_PATTERNS = [
  /^\/$/,                      // Homepage
  /^\/about/i,                 // About pages
  /^\/services/i,              // Services
  /^\/products/i,              // Products
  /^\/solutions/i,             // Solutions
  /^\/team/i,                  // Team pages
  /^\/staff/i,                 // Staff pages
  /^\/people/i,                // People pages
  /^\/employees/i,             // Employee pages
  /^\/advisors/i,              // Advisors
  /^\/consultants/i,           // Consultants
  /^\/experts/i,               // Experts
  /^\/contact/i,               // Contact pages
  /^\/blog/i,                  // Blog posts
  /^\/news/i,                  // News articles
  /^\/articles/i,              // Articles
  /^\/insights/i,              // Insights
  /^\/resources/i,             // Resources
  /^\/case-studies/i,          // Case studies
  /^\/careers/i,               // Careers
  /^\/jobs/i,                  // Job listings
  /^\/positions/i,             // Positions
  /^\/opportunities/i,         // Opportunities
  /^\/industries/i,            // Industries
  /^\/sectors/i,               // Sectors
  /^\/expertise/i,             // Expertise areas
  /^\/specialties/i,           // Specialties
  /^\/capabilities/i,          // Capabilities
  /^\/en\//i,                  // English language sections
  /^\/de\//i,                  // German language sections
  /^\/fr\//i,                  // French language sections
  /^\/es\//i,                  // Spanish language sections
  /^\/no\//i,                  // Norwegian language sections
  /^\/sv\//i,                  // Swedish language sections
  /^\/da\//i,                  // Danish language sections
  /^\/author\//i,              // Author pages
  /^\/category\//i,            // Category pages
  /^\/tag\//i,                 // Tag pages
  /^\/page\/\d+/i,             // Pagination
  /\/radgivere/i,              // Advisors (Norwegian)
  /\/tjenester/i,              // Services (Norwegian)
  /\/bransjer/i,               // Industries (Norwegian)
  /\/funksjoner/i,             // Functions (Norwegian)
  /\/stillinger/i,             // Positions (Norwegian)
  /\/om-oss/i,                 // About us (Norwegian)
  /\/ekspertise/i,             // Expertise (Norwegian)
];

export async function discoverLinks(
  url: string,
  excludePaths: string[] = [],
  includePaths: string[] = [],
  maxPages: number = Number.MAX_SAFE_INTEGER
): Promise<string[]> {
  try {
    console.log('🔍 Starting enhanced link discovery for:', url);
    console.log('📋 Exclude paths:', excludePaths);
    console.log('📋 Include paths:', includePaths);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.log('❌ Failed to fetch main URL, using fallback');
      return [url];
    }

    const html = await response.text();
    const discovered = new Set<string>([url]); // Always include the main URL
    
    // Extract all links from the document (no semantic container restrictions)
    const allLinks = extractAllLinks(html, url);
    console.log(`🔗 Found ${allLinks.length} total links in HTML`);
    
    // Apply filtering and normalization - NO LIMIT
    const filteredLinks = filterAndNormalizeUrls(allLinks, url, {
      excludePaths,
      includePaths,
      maxPages: Number.MAX_SAFE_INTEGER
    });
    
    // Add filtered links to discovered set
    filteredLinks.forEach(link => discovered.add(link));
    
    console.log(`📊 Discovery completed: ${discovered.size} URLs found after filtering`);
    
    // Return ALL URLs without any limit
    const result = Array.from(discovered);
    return result;
    
  } catch (error) {
    console.error('❌ Error discovering links:', error);
    return [url]; // Fallback to just the main URL
  }
}

export async function discoverSitemapLinks(
  sitemapUrl: string,
  excludePaths: string[] = [],
  includePaths: string[] = []
): Promise<string[]> {
  try {
    console.log('🗺️ Starting enhanced sitemap discovery for:', sitemapUrl);
    
    const baseUrl = new URL(sitemapUrl);
    const sitemapLocations = [
      `${baseUrl.protocol}//${baseUrl.hostname}/sitemap.xml`,
      `${baseUrl.protocol}//${baseUrl.hostname}/sitemap_index.xml`,
      `${baseUrl.protocol}//${baseUrl.hostname}/wp-sitemap.xml`,
      `${baseUrl.protocol}//${baseUrl.hostname}/sitemap-index.xml`,
    ];
    
    let allUrls: string[] = [];
    
    // Try different sitemap locations
    for (const sitemapLocation of sitemapLocations) {
      try {
        console.log('🗺️ Trying sitemap URL:', sitemapLocation);
        
        const response = await fetch(sitemapLocation, {
          headers: {
            'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
          },
          signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
          console.log(`❌ Sitemap not found at ${sitemapLocation}`);
          continue;
        }

        const xmlText = await response.text();
        
        // Check if this is a sitemap index
        if (xmlText.includes('<sitemapindex')) {
          console.log('📑 Found sitemap index, processing child sitemaps...');
          const indexUrls = await processSitemapIndex(xmlText, baseUrl.origin);
          allUrls.push(...indexUrls);
        } else {
          console.log('📄 Processing regular sitemap...');
          const sitemapUrls = parseSitemapXml(xmlText);
          allUrls.push(...sitemapUrls);
        }
        
        // If we found URLs, break out of the loop
        if (allUrls.length > 1) { // More than just the base URL
          console.log(`✅ Successfully processed sitemap at ${sitemapLocation}`);
          break;
        }
        
      } catch (error) {
        console.log(`❌ Error processing sitemap at ${sitemapLocation}:`, error);
        continue;
      }
    }
    
    if (allUrls.length === 0) {
      console.log('❌ No valid sitemaps found, falling back to HTML discovery');
      return await discoverLinks(sitemapUrl, excludePaths, includePaths, Number.MAX_SAFE_INTEGER);
    }
    
    console.log(`🗺️ Found ${allUrls.length} URLs in sitemap(s)`);
    
    // Apply filtering to sitemap URLs - NO LIMIT
    const filteredUrls = filterAndNormalizeUrls(allUrls, sitemapUrl, {
      excludePaths,
      includePaths,
      maxPages: Number.MAX_SAFE_INTEGER
    });
    
    console.log(`✅ Sitemap discovery completed: ${filteredUrls.length} URLs after filtering`);
    return filteredUrls;
    
  } catch (error) {
    console.error('❌ Error discovering sitemap links:', error);
    console.log('🔄 Falling back to HTML discovery');
    return await discoverLinks(sitemapUrl, excludePaths, includePaths, Number.MAX_SAFE_INTEGER);
  }
}

function extractAllLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkPattern = /href\s*=\s*["']([^"']+)["']/gi;
  
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    try {
      const href = match[1].trim();
      
      // Skip empty hrefs, fragments, and javascript/mailto links
      if (!href || href === '#' || href.startsWith('#') || 
          href.startsWith('javascript:') || href.startsWith('mailto:') || 
          href.startsWith('tel:')) {
        continue;
      }
      
      // Resolve to absolute URL
      const absoluteUrl = new URL(href, baseUrl);
      
      // Only include same-domain links
      const baseHostname = new URL(baseUrl).hostname;
      if (absoluteUrl.hostname === baseHostname) {
        links.push(absoluteUrl.href);
      }
    } catch (e) {
      // Invalid URL, skip
      continue;
    }
  }
  
  return links;
}

async function processSitemapIndex(xmlText: string, baseOrigin: string): Promise<string[]> {
  const sitemapUrls: string[] = [];
  const sitemapRegex = /<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g;
  
  let match;
  while ((match = sitemapRegex.exec(xmlText)) !== null) {
    const sitemapUrl = match[1].trim();
    if (sitemapUrl && sitemapUrl.startsWith('http')) {
      sitemapUrls.push(sitemapUrl);
    }
  }
  
  console.log(`📑 Found ${sitemapUrls.length} child sitemaps`);
  
  const allUrls: string[] = [];
  
  // Process each child sitemap
  for (const sitemapUrl of sitemapUrls) {
    try {
      console.log(`📄 Processing child sitemap: ${sitemapUrl}`);
      
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (response.ok) {
        const childXml = await response.text();
        const childUrls = parseSitemapXml(childXml);
        allUrls.push(...childUrls);
        console.log(`📄 Added ${childUrls.length} URLs from ${sitemapUrl}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to process child sitemap: ${sitemapUrl}`, error);
    }
  }
  
  return allUrls;
}

function parseSitemapXml(xmlText: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  
  let match;
  while ((match = locRegex.exec(xmlText)) !== null) {
    const url = match[1].trim();
    if (url && url.startsWith('http')) {
      urls.push(url);
    }
  }
  
  return urls;
}

function filterAndNormalizeUrls(
  urls: string[], 
  baseUrl: string, 
  config: DiscoveryConfig
): string[] {
  const { excludePaths, includePaths } = config;
  const baseHostname = new URL(baseUrl).hostname;
  const normalizedUrls = new Set<string>();
  
  // Combine default excludes with custom excludes
  const allExcludePatterns = [...DEFAULT_EXCLUDES];
  excludePaths.forEach(pattern => {
    try {
      allExcludePatterns.push(new RegExp(pattern.replace(/\*/g, '.*'), 'i'));
    } catch (e) {
      // If regex fails, treat as literal string
      allExcludePatterns.push(new RegExp(escapeRegex(pattern), 'i'));
    }
  });
  
  // Prepare include patterns - use custom ones if provided, otherwise use universal patterns
  const includePatterns: RegExp[] = [];
  const patternsToUse = includePaths.length > 0 ? includePaths : [];
  
  // Convert custom include patterns
  patternsToUse.forEach(pattern => {
    try {
      includePatterns.push(new RegExp(pattern.replace(/\*/g, '.*'), 'i'));
    } catch (e) {
      includePatterns.push(new RegExp(escapeRegex(pattern), 'i'));
    }
  });
  
  for (const url of urls) {
    try {
      // Normalize URL
      const normalized = normalizeUrl(url);
      if (!normalized) continue;
      
      const urlObj = new URL(normalized);
      
      // Only same domain
      if (urlObj.hostname.toLowerCase() !== baseHostname.toLowerCase()) {
        continue;
      }
      
      const path = urlObj.pathname + urlObj.search;
      
      // Apply exclude filters
      if (allExcludePatterns.some(pattern => pattern.test(path))) {
        continue;
      }
      
      // Apply include filters
      if (includePatterns.length > 0) {
        // If custom include patterns are provided, URL must match at least one
        if (!includePatterns.some(pattern => pattern.test(path))) {
          continue;
        }
      } else {
        // If no custom include patterns, use universal content patterns as a guide
        // But be more permissive - only exclude if it's clearly not content
        const isLikelyContent = UNIVERSAL_CONTENT_PATTERNS.some(pattern => pattern.test(path)) ||
                              path === '/' || // Always include homepage
                              (path.split('/').length <= 3 && !path.includes('?')); // Include shallow paths without query params
        
        if (!isLikelyContent) {
          continue;
        }
      }
      
      normalizedUrls.add(normalized);
      
    } catch (e) {
      continue;
    }
  }
  
  return Array.from(normalizedUrls);
}

function normalizeUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Normalize hostname to lowercase
    urlObj.hostname = urlObj.hostname.toLowerCase();
    
    // Remove tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'mc_cid', 'mc_eid', '_ga', '_gl'
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Remove fragment
    urlObj.hash = '';
    
    // Remove trailing slash for non-root paths
    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    return urlObj.toString();
  } catch (e) {
    return null;
  }
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
