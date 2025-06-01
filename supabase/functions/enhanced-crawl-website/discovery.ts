
export async function discoverLinks(
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

export async function discoverSitemapLinks(sitemapUrl: string): Promise<string[]> {
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
