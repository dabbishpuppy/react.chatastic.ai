
// Legacy discovery.ts - updated to use enhanced discovery system
import { 
  discoverFromWebsite, 
  discoverFromSitemap, 
  createDefaultFilterConfig 
} from './enhancedDiscovery.ts';

export async function discoverLinks(
  url: string,
  excludePaths: string[] = [],
  includePaths: string[] = [],
  maxPages: number = 100
): Promise<string[]> {
  console.log('🔄 Using enhanced discovery system (legacy interface)');
  
  try {
    const filterConfig = createDefaultFilterConfig(url);
    
    // Add custom patterns
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
    
    return await discoverFromWebsite(url, filterConfig, maxPages);
  } catch (error) {
    console.error('❌ Enhanced discovery error (legacy):', error);
    return [url]; // Fallback
  }
}

export async function discoverSitemapLinks(
  sitemapUrl: string,
  excludePaths: string[] = [],
  includePaths: string[] = []
): Promise<string[]> {
  console.log('🔄 Using enhanced sitemap discovery (legacy interface)');
  
  try {
    const filterConfig = createDefaultFilterConfig(sitemapUrl);
    
    // Add custom patterns
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
    
    return await discoverFromSitemap(sitemapUrl, filterConfig);
  } catch (error) {
    console.error('❌ Enhanced sitemap discovery error (legacy):', error);
    return [sitemapUrl]; // Fallback
  }
}

// Legacy helper functions for backward compatibility
function shouldExcludePath(path: string, excludePaths: string[]): boolean {
  // This is now handled by the enhanced filtering system
  return false;
}

function shouldIncludePath(path: string, includePaths: string[]): boolean {
  // This is now handled by the enhanced filtering system
  return true;
}
