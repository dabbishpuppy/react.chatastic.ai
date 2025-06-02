
export async function discoverLinks(
  url: string,
  excludePaths: string[] = [],
  includePaths: string[] = [],
  maxPages: number = 100
): Promise<string[]> {
  try {
    console.log('🔍 Starting link discovery for:', url);
    console.log('📋 Exclude paths:', excludePaths);
    console.log('📋 Include paths:', includePaths);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.log('❌ Failed to fetch main URL, using fallback');
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
          
          console.log('🔗 Checking path:', path);
          
          // Apply exclude filters first
          if (shouldExcludePath(path, excludePaths)) {
            console.log('❌ Excluding path:', path);
            continue;
          }
          
          // Apply include filters if specified
          if (includePaths.length > 0 && !shouldIncludePath(path, includePaths)) {
            console.log('⚠️ Path not in include list:', path);
            continue;
          }
          
          console.log('✅ Including path:', path);
          discovered.add(fullUrl);
          
          // Limit discovery to prevent runaway crawls
          if (discovered.size >= maxPages) break;
        }
      } catch (e) {
        continue; // Invalid URL, skip
      }
    }

    console.log(`📊 Discovery completed: ${discovered.size} URLs found after filtering`);
    return Array.from(discovered);
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
    console.log('🗺️ Discovering links from sitemap:', sitemapUrl);
    console.log('📋 Exclude paths:', excludePaths);
    console.log('📋 Include paths:', includePaths);
    
    // Try to find sitemap.xml if not explicitly provided
    let actualSitemapUrl = sitemapUrl;
    if (!sitemapUrl.includes('sitemap')) {
      const baseUrl = new URL(sitemapUrl);
      actualSitemapUrl = `${baseUrl.protocol}//${baseUrl.hostname}/sitemap.xml`;
    }
    
    const response = await fetch(actualSitemapUrl, {
      headers: {
        'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      console.log('❌ Sitemap not found, falling back to main URL');
      return [sitemapUrl];
    }

    const xmlText = await response.text();
    const allUrls = parseSitemapXml(xmlText);
    
    // Apply filtering to sitemap URLs
    const filteredUrls = allUrls.filter(url => {
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        
        // Apply exclude filters
        if (shouldExcludePath(path, excludePaths)) {
          console.log('❌ Excluding sitemap URL:', path);
          return false;
        }
        
        // Apply include filters if specified
        if (includePaths.length > 0 && !shouldIncludePath(path, includePaths)) {
          console.log('⚠️ Sitemap URL not in include list:', path);
          return false;
        }
        
        console.log('✅ Including sitemap URL:', path);
        return true;
      } catch (e) {
        return false;
      }
    });
    
    console.log(`✅ Discovered ${filteredUrls.length} URLs from sitemap after filtering (${allUrls.length} total)`);
    return filteredUrls;
    
  } catch (error) {
    console.error('❌ Error discovering sitemap links:', error);
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
    console.error('❌ Error parsing sitemap XML:', error);
  }
  
  return urls;
}

function shouldExcludePath(path: string, excludePaths: string[]): boolean {
  const defaultExcludes = [
    '/wp-json/*', '/wp-admin/*', '/wp-content/*', '/xmlrpc.php', '/checkout/*', 
    '/cart/*', '/admin/*', '/api/*', '*.json', '*.xml', '*.rss', '*.css', '*.js',
    '*.jpg', '*.jpeg', '*.png', '*.gif', '*.svg', '*.ico', '*.pdf'
  ];
  
  const allExcludes = [...defaultExcludes, ...excludePaths];
  
  return allExcludes.some(pattern => {
    // Handle glob patterns
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
      return regex.test(path);
    }
    
    // Handle exact matches or prefix matches
    if (pattern.endsWith('/')) {
      return path.toLowerCase().startsWith(pattern.toLowerCase());
    }
    
    return path.toLowerCase().includes(pattern.toLowerCase());
  });
}

function shouldIncludePath(path: string, includePaths: string[]): boolean {
  if (includePaths.length === 0) return true;
  
  return includePaths.some(pattern => {
    // Handle glob patterns
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
      return regex.test(path);
    }
    
    // Handle exact matches or prefix matches
    if (pattern.endsWith('/')) {
      return path.toLowerCase().startsWith(pattern.toLowerCase());
    }
    
    return path.toLowerCase().includes(pattern.toLowerCase());
  });
}
