
/**
 * Link Extraction Module
 * Extracts only customer-facing links from HTML content
 */

// Semantic HTML containers that typically contain customer-facing navigation
const SEMANTIC_CONTAINERS = [
  'nav', 'header', 'main', 'article', 'section', 'footer'
];

// CSS selectors for hidden elements
const HIDDEN_ELEMENT_SELECTORS = [
  '[style*="display:none"]',
  '[style*="display: none"]',
  '[style*="visibility:hidden"]',
  '[style*="visibility: hidden"]',
  '[aria-hidden="true"]',
  '.hidden',
  '.sr-only',
  '.visually-hidden'
];

/**
 * Extract customer-facing links from HTML content
 * @param {string} html - HTML content to parse
 * @param {string} baseUrl - Base URL for resolving relative links
 * @returns {string[]} Array of extracted URLs
 */
export function extractFrontEndLinks(html, baseUrl) {
  const links = new Set();
  
  try {
    // Create a simple HTML parser using regex since we're in Deno
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis);
    
    for (const match of linkMatches) {
      const href = match[1];
      const linkContent = match[2];
      const fullMatch = match[0];
      
      // Skip if link is empty or just a fragment
      if (!href || href === '#' || href.startsWith('#')) continue;
      
      // Skip if link has rel="nofollow"
      if (fullMatch.includes('rel="nofollow"') || fullMatch.includes("rel='nofollow'")) continue;
      
      // Skip if link appears to be hidden
      if (isHiddenLink(fullMatch, linkContent)) continue;
      
      // Skip if link is not in a semantic container
      if (!isInSemanticContainer(html, fullMatch)) continue;
      
      // Resolve relative URLs
      const absoluteUrl = resolveUrl(href, baseUrl);
      if (absoluteUrl) {
        links.add(absoluteUrl);
      }
    }
  } catch (error) {
    console.error('Error extracting links:', error);
  }
  
  return Array.from(links);
}

/**
 * Check if a link is hidden using various methods
 * @param {string} linkHtml - Full link HTML
 * @param {string} linkContent - Link text content
 * @returns {boolean} True if link appears to be hidden
 */
function isHiddenLink(linkHtml, linkContent) {
  // Check for hidden CSS properties
  const hiddenPatterns = [
    /display\s*:\s*none/i,
    /visibility\s*:\s*hidden/i,
    /aria-hidden\s*=\s*["']true["']/i
  ];
  
  for (const pattern of hiddenPatterns) {
    if (pattern.test(linkHtml)) return true;
  }
  
  // Check for common hidden classes
  const hiddenClasses = ['hidden', 'sr-only', 'visually-hidden', 'screen-reader-only'];
  for (const className of hiddenClasses) {
    if (new RegExp(`class\\s*=\\s*["'][^"']*\\b${className}\\b`, 'i').test(linkHtml)) {
      return true;
    }
  }
  
  // Check if link content suggests it's for screen readers only
  if (/skip\s+to|screen\s+reader/i.test(linkContent)) return true;
  
  return false;
}

/**
 * Check if a link is within a semantic container
 * @param {string} html - Full HTML content
 * @param {string} linkHtml - Link HTML to find
 * @returns {boolean} True if link is in a semantic container
 */
function isInSemanticContainer(html, linkHtml) {
  const linkIndex = html.indexOf(linkHtml);
  if (linkIndex === -1) return false;
  
  // Look backwards from link position to find containing semantic elements
  const beforeLink = html.substring(0, linkIndex);
  const afterLink = html.substring(linkIndex + linkHtml.length);
  
  for (const container of SEMANTIC_CONTAINERS) {
    const openTag = new RegExp(`<${container}[^>]*>`, 'gi');
    const closeTag = new RegExp(`</${container}>`, 'gi');
    
    // Find the last opening tag before the link
    let lastOpen = -1;
    let match;
    while ((match = openTag.exec(beforeLink)) !== null) {
      lastOpen = match.index;
    }
    
    if (lastOpen !== -1) {
      // Check if there's a closing tag after the link
      const closingMatch = closeTag.exec(afterLink);
      if (closingMatch) {
        return true; // Link is within this semantic container
      }
    }
  }
  
  return false;
}

/**
 * Resolve relative URLs to absolute URLs
 * @param {string} href - URL to resolve
 * @param {string} baseUrl - Base URL for resolution
 * @returns {string|null} Resolved absolute URL or null if invalid
 */
function resolveUrl(href, baseUrl) {
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
    const base = new URL(baseUrl);
    const resolved = new URL(href, base);
    return resolved.toString();
  } catch (error) {
    console.warn(`Failed to resolve URL: ${href} with base: ${baseUrl}`, error);
    return null;
  }
}

/**
 * Extract navigation-specific links (primary navigation areas)
 * @param {string} html - HTML content
 * @param {string} baseUrl - Base URL
 * @returns {string[]} Navigation links
 */
export function extractNavigationLinks(html, baseUrl) {
  const navLinks = new Set();
  
  // Look for navigation-specific containers
  const navPatterns = [
    /<nav[^>]*>(.*?)<\/nav>/gis,
    /<header[^>]*>(.*?)<\/header>/gis,
    /<div[^>]*class=["'][^"']*nav[^"']*["'][^>]*>(.*?)<\/div>/gis,
    /<ul[^>]*class=["'][^"']*menu[^"']*["'][^>]*>(.*?)<\/ul>/gis
  ];
  
  for (const pattern of navPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const navContent = match[1];
      const links = extractFrontEndLinks(navContent, baseUrl);
      links.forEach(link => navLinks.add(link));
    }
  }
  
  return Array.from(navLinks);
}
