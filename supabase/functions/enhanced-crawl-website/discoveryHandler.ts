
import { discoverLinks, discoverSitemapLinks } from './discovery.ts';

export async function handleUrlDiscovery(
  url: string,
  crawlMode: string,
  maxPages: number,
  excludePaths: string[],
  includePaths: string[]
): Promise<string[]> {
  let discoveredUrls: string[] = [];
  
  try {
    console.log(`🔍 Starting URL discovery for mode: ${crawlMode}`);
    
    const discoveryPromise = (async () => {
      switch (crawlMode) {
        case 'single-page':
          return [url];
        case 'sitemap-only':
          return await discoverSitemapLinks(url, excludePaths, includePaths);
        case 'full-website':
        default:
          return await discoverLinks(url, excludePaths, includePaths, maxPages);
      }
    })();

    // Add timeout to discovery
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('URL discovery timeout')), 30000); // 30 second timeout
    });

    discoveredUrls = await Promise.race([discoveryPromise, timeoutPromise]) as string[];
    
  } catch (discoveryError) {
    console.error('❌ URL discovery error:', discoveryError);
    // Fallback to single URL to ensure we have something to process
    discoveredUrls = [url];
    console.log('🔄 Falling back to single URL due to discovery error');
  }

  console.log(`📊 Discovery completed: ${discoveredUrls.length} URLs found`);

  if (discoveredUrls.length === 0) {
    throw new Error('No URLs discovered for crawling');
  }

  return discoveredUrls;
}
