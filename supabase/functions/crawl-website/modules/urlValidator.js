
/**
 * URL Validation Module
 * Comprehensive URL validation and filtering
 */

// Default exclude patterns for common admin/API paths
export const DEFAULT_EXCLUDE_PATTERNS = [
  // Admin areas
  /\/admin(\/|$|\?)/i,
  /\/wp-admin(\/|$|\?)/i,
  /\/administrator(\/|$|\?)/i,
  /\/backend(\/|$|\?)/i,
  /\/panel(\/|$|\?)/i,
  
  // Authentication
  /\/login(\/|$|\?)/i,
  /\/signin(\/|$|\?)/i,
  /\/signup(\/|$|\?)/i,
  /\/register(\/|$|\?)/i,
  /\/logout(\/|$|\?)/i,
  /\/auth(\/|$|\?)/i,
  
  // User areas
  /\/dashboard(\/|$|\?)/i,
  /\/profile(\/|$|\?)/i,
  /\/account(\/|$|\?)/i,
  /\/user(\/|$|\?)/i,
  /\/member(\/|$|\?)/i,
  /\/settings(\/|$|\?)/i,
  /\/preferences(\/|$|\?)/i,
  
  // API endpoints
  /\/api(\/|$|\?)/i,
  /\/rest(\/|$|\?)/i,
  /\/graphql(\/|$|\?)/i,
  /\/webhook(\/|$|\?)/i,
  /\/callback(\/|$|\?)/i,
  
  // WordPress specific
  /\/wp-content\//i,
  /\/wp-includes\//i,
  /\/wp-json(\/|$|\?)/i,
  /\/xmlrpc\.php/i,
  /\/wp-login\.php/i,
  
  // System files
  /\/robots\.txt$/i,
  /\/sitemap\.xml$/i,
  /\/favicon\.ico$/i,
  /\/\.well-known\//i,
  
  // File extensions
  /\.(?:js|css|scss|sass|less|map|woff|woff2|ttf|eot|otf)$/i,
  /\.(?:jpg|jpeg|png|gif|svg|webp|ico|bmp|tiff|avif)$/i,
  /\.(?:pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|tar|gz)$/i,
  /\.(?:json|xml|csv|txt|log)$/i,
  /\.(?:mp4|mp3|wav|avi|mov|webm|flv|mkv|wmv)$/i,
  
  // CMS specific paths
  /\/editor(\/|$|\?)/i,
  /\/preview(\/|$|\?)/i,
  /\/draft(\/|$|\?)/i,
  /\/revision(\/|$|\?)/i,
  
  // Development/staging
  /\/dev(\/|$|\?)/i,
  /\/test(\/|$|\?)/i,
  /\/staging(\/|$|\?)/i,
  /\/debug(\/|$|\?)/i,
  
  // Search and filters (often not customer pages)
  /\/search\?/i,
  /\/filter\?/i,
  /\?.*search=/i,
  /\?.*filter=/i
];

/**
 * Check if URL should be excluded by default patterns
 * @param {string} url - URL to check
 * @returns {boolean} True if URL should be excluded
 */
export function matchesDefaultExcludes(url) {
  try {
    const urlObj = new URL(url);
    const fullPath = urlObj.pathname + urlObj.search;
    
    return DEFAULT_EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath));
  } catch (error) {
    console.warn(`Invalid URL for default exclude check: ${url}`, error);
    return true; // Exclude invalid URLs
  }
}

/**
 * Validate if URL is a customer-facing page
 * @param {string} url - URL to validate
 * @param {string} baseDomain - Base domain to check against
 * @returns {{valid: boolean, reason?: string}} Validation result
 */
export function isCustomerFacingUrl(url, baseDomain) {
  try {
    const urlObj = new URL(url);
    
    // Must be same domain
    const urlDomain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    if (urlDomain !== baseDomain) {
      return { valid: false, reason: 'Different domain' };
    }
    
    // Check against default excludes
    if (matchesDefaultExcludes(url)) {
      return { valid: false, reason: 'Matches default exclude patterns' };
    }
    
    // Check URL length (very long URLs are often not customer pages)
    if (url.length > 500) {
      return { valid: false, reason: 'URL too long' };
    }
    
    // Check path depth (very deep paths are often not customer pages)
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 10) {
      return { valid: false, reason: 'Path too deep' };
    }
    
    // Check for suspicious query parameters
    const suspiciousParams = ['debug', 'test', 'dev', 'admin', 'edit', 'preview'];
    for (const param of suspiciousParams) {
      if (urlObj.searchParams.has(param)) {
        return { valid: false, reason: `Contains suspicious parameter: ${param}` };
      }
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: `Invalid URL: ${error.message}` };
  }
}

/**
 * Normalize URL for consistent comparison
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
export function normalizeUrl(url) {
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    
    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'mc_cid', 'mc_eid', '_ga', '_gl',
      'ref', 'source', 'campaign'
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Remove fragment
    urlObj.hash = '';
    
    // Normalize trailing slash for paths (but not for root)
    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    return urlObj.toString();
  } catch (error) {
    console.warn(`Failed to normalize URL: ${url}`, error);
    return url;
  }
}

/**
 * Extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string} Domain without www prefix
 */
export function extractDomain(url) {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);
    return urlObj.hostname.toLowerCase().replace(/^www\./, '');
  } catch (error) {
    console.warn(`Failed to extract domain from: ${url}`, error);
    return '';
  }
}

/**
 * Filter URLs based on all validation criteria
 * @param {string[]} urls - URLs to filter
 * @param {string} baseDomain - Base domain
 * @param {string[]} includePatterns - Include patterns
 * @param {string[]} excludePatterns - Exclude patterns
 * @returns {Object} Filtered results with statistics
 */
export function filterUrls(urls, baseDomain, includePatterns = [], excludePatterns = []) {
  const results = {
    valid: [],
    filtered: [],
    stats: {
      total: urls.length,
      validCount: 0,
      filteredByDomain: 0,
      filteredByDefault: 0,
      filteredByInclude: 0,
      filteredByExclude: 0,
      filteredByStructure: 0
    }
  };
  
  const seenUrls = new Set();
  
  for (const url of urls) {
    const normalized = normalizeUrl(url);
    
    // Skip duplicates
    if (seenUrls.has(normalized)) continue;
    seenUrls.add(normalized);
    
    // Check if customer-facing
    const validation = isCustomerFacingUrl(normalized, baseDomain);
    if (!validation.valid) {
      results.filtered.push({ url: normalized, reason: validation.reason });
      if (validation.reason === 'Different domain') results.stats.filteredByDomain++;
      else if (validation.reason === 'Matches default exclude patterns') results.stats.filteredByDefault++;
      else results.stats.filteredByStructure++;
      continue;
    }
    
    // Check include patterns
    if (includePatterns.length > 0) {
      const matchesInclude = includePatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
          return regex.test(normalized);
        } catch {
          return normalized.includes(pattern);
        }
      });
      
      if (!matchesInclude) {
        results.filtered.push({ url: normalized, reason: 'Does not match include patterns' });
        results.stats.filteredByInclude++;
        continue;
      }
    }
    
    // Check exclude patterns
    if (excludePatterns.length > 0) {
      const matchesExclude = excludePatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
          return regex.test(normalized);
        } catch {
          return normalized.includes(pattern);
        }
      });
      
      if (matchesExclude) {
        results.filtered.push({ url: normalized, reason: 'Matches exclude patterns' });
        results.stats.filteredByExclude++;
        continue;
      }
    }
    
    // URL passed all filters
    results.valid.push(normalized);
    results.stats.validCount++;
  }
  
  return results;
}
