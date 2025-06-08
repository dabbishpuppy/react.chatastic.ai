
import { 
  discoverFromSitemap, 
  discoverFromWebsite, 
  createDefaultFilterConfig,
  normalizeUrl,
  type UrlFilterConfig 
} from './enhancedDiscovery.ts';

export async function handleUrlDiscovery(
  url: string,
  crawlMode: string,
  maxPages: number,
  excludePaths: string[],
  includePaths: string[]
): Promise<string[]> {
  console.log(`🚀 Starting enhanced URL discovery for mode: ${crawlMode}`);
  console.log(`📊 Target: ${url}, Max pages: ${maxPages}`);
  
  // Normalize the base URL
  const normalizedUrl = normalizeUrl(url);
  
  // Create filter configuration
  const filterConfig = createDefaultFilterConfig(normalizedUrl);
  
  // Add custom patterns if provided
  if (includePaths.length > 0) {
    const customIncludes = includePaths
      .filter(path => path && path.trim())
      .map(path => new RegExp(path.replace(/\*/g, '.*'), 'i'));
    filterConfig.includePatterns.push(...customIncludes);
  }
  
  if (excludePaths.length > 0) {
    const customExcludes = excludePaths
      .filter(path => path && path.trim())
      .map(path => new RegExp(path.replace(/\*/g, '.*'), 'i'));
    filterConfig.excludePatterns.push(...customExcludes);
  }
  
  let discoveredUrls: string[] = [];
  
  try {
    switch (crawlMode) {
      case 'single-page':
        console.log('📄 Single page mode - returning base URL only');
        discoveredUrls = [normalizedUrl];
        break;
        
      case 'sitemap-only':
        console.log('🗺️ Sitemap-only mode - enhanced sitemap discovery');
        discoveredUrls = await discoverFromSitemap(normalizedUrl, filterConfig);
        
        // Fallback to base URL if sitemap discovery fails
        if (discoveredUrls.length === 0) {
          console.log('⚠️ Sitemap discovery returned no URLs, using base URL');
          discoveredUrls = [normalizedUrl];
        }
        break;
        
      case 'full-website':
      default:
        console.log('🌐 Full website mode - comprehensive discovery');
        
        // Try sitemap first for seed URLs
        const sitemapUrls = await discoverFromSitemap(normalizedUrl, filterConfig);
        console.log(`📊 Sitemap provided ${sitemapUrls.length} seed URLs`);
        
        // Use website discovery with higher limits
        discoveredUrls = await discoverFromWebsite(normalizedUrl, filterConfig, maxPages);
        
        // Merge sitemap URLs that might not have been discovered through crawling
        const urlSet = new Set(discoveredUrls);
        for (const sitemapUrl of sitemapUrls) {
          if (!urlSet.has(sitemapUrl)) {
            discoveredUrls.push(sitemapUrl);
          }
        }
        
        console.log(`📊 Combined discovery found ${discoveredUrls.length} total URLs`);
        break;
    }
    
  } catch (discoveryError) {
    console.error('❌ Enhanced URL discovery error:', discoveryError);
    // Fallback to single URL to ensure we have something to process
    discoveredUrls = [normalizedUrl];
    console.log('🔄 Falling back to single URL due to discovery error');
  }

  // Final validation and logging
  console.log(`✅ Enhanced discovery completed: ${discoveredUrls.length} URLs found`);
  
  if (discoveredUrls.length === 0) {
    throw new Error('No URLs discovered for crawling');
  }
  
  // Log sample URLs for debugging
  const sampleUrls = discoveredUrls.slice(0, 10);
  console.log('📋 Sample discovered URLs:', sampleUrls);
  
  if (discoveredUrls.length > 10) {
    console.log(`... and ${discoveredUrls.length - 10} more URLs`);
  }

  return discoveredUrls;
}
