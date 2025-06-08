
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
    console.log(`🔍 Starting enhanced URL discovery for mode: ${crawlMode}`);
    console.log(`🎯 Target: ${url}`);
    console.log(`📊 Max pages: UNLIMITED (${maxPages} requested but ignored)`);
    console.log(`🚫 Exclude paths: ${excludePaths.length} patterns`);
    console.log(`✅ Include paths: ${includePaths.length} patterns (using universal defaults if none provided)`);
    
    const discoveryPromise = (async () => {
      switch (crawlMode) {
        case 'single-page':
          console.log('📄 Single page mode: returning target URL only');
          return [url];
          
        case 'sitemap-only':
          console.log('🗺️ Sitemap-only mode: processing sitemap(s) with enhanced logic');
          return await discoverSitemapLinks(url, excludePaths, includePaths);
          
        case 'full-website':
        default:
          console.log('🌐 Full website mode: comprehensive discovery with universal patterns');
          
          // Try sitemap first for full website mode
          try {
            const sitemapUrls = await discoverSitemapLinks(url, excludePaths, includePaths);
            if (sitemapUrls.length > 1) { // More than just the base URL
              console.log(`✅ Sitemap discovery successful: ${sitemapUrls.length} URLs found`);
              return sitemapUrls;
            }
          } catch (sitemapError) {
            console.log('⚠️ Sitemap discovery failed, falling back to HTML crawling');
          }
          
          // Fallback to enhanced HTML crawling with no limits
          console.log('🔗 Using enhanced HTML link discovery with no limits');
          return await discoverLinks(url, excludePaths, includePaths, Number.MAX_SAFE_INTEGER);
      }
    })();

    // Add timeout to discovery with longer timeout for comprehensive crawling
    const timeoutDuration = crawlMode === 'full-website' ? 120000 : 60000; // 120s for full, 60s for others
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`URL discovery timeout after ${timeoutDuration}ms`)), timeoutDuration);
    });

    discoveredUrls = await Promise.race([discoveryPromise, timeoutPromise]) as string[];
    
    console.log(`📊 Discovery completed successfully:`);
    console.log(`   • Mode: ${crawlMode}`);
    console.log(`   • URLs discovered: ${discoveredUrls.length} (NO LIMITS APPLIED)`);
    console.log(`   • First 5 URLs:`, discoveredUrls.slice(0, 5));
    
  } catch (discoveryError) {
    console.error('❌ URL discovery error:', discoveryError);
    
    // Enhanced fallback logic
    console.log('🔄 Implementing enhanced fallback strategy...');
    
    if (crawlMode === 'sitemap-only') {
      // For sitemap mode, try basic HTML discovery as fallback
      try {
        discoveredUrls = await discoverLinks(url, excludePaths, includePaths, Number.MAX_SAFE_INTEGER);
        console.log(`🔄 Fallback HTML discovery found ${discoveredUrls.length} URLs`);
      } catch (fallbackError) {
        console.error('❌ Fallback discovery also failed:', fallbackError);
        discoveredUrls = [url];
      }
    } else {
      // For other modes, just use the original URL
      discoveredUrls = [url];
    }
    
    console.log('🔄 Using fallback result due to discovery error');
  }

  if (discoveredUrls.length === 0) {
    console.warn('⚠️ No URLs discovered, adding original URL as fallback');
    discoveredUrls = [url];
  }

  // Final deduplication and validation
  const finalUrls = [...new Set(discoveredUrls)].filter(discoveredUrl => {
    try {
      new URL(discoveredUrl); // Validate URL format
      return true;
    } catch (e) {
      console.warn(`⚠️ Removing invalid URL: ${discoveredUrl}`);
      return false;
    }
  });

  console.log(`🎉 Final discovery result: ${finalUrls.length} valid URLs (NO LIMITS APPLIED)`);
  
  return finalUrls;
}
