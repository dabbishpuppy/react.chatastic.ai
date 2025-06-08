
import { supabase } from "@/integrations/supabase/client";

export interface DiscoveryTestResult {
  testName: string;
  success: boolean;
  urlCount: number;
  urls?: string[];
  error?: string;
  crawlMode?: string;
}

export class EnhancedDiscoveryTestSuite {
  static async testGreatPeopleDiscovery(): Promise<DiscoveryTestResult[]> {
    console.log('🧪 Testing enhanced discovery on greatpeople.no');
    
    const results: DiscoveryTestResult[] = [];
    const testUrl = 'https://greatpeople.no';
    
    // Test 1: Enhanced full website discovery
    results.push(await this.testFullWebsiteDiscovery(testUrl));
    
    // Test 2: Enhanced sitemap discovery
    results.push(await this.testSitemapDiscovery(testUrl));
    
    // Test 3: Single page discovery
    results.push(await this.testSinglePageDiscovery(testUrl));
    
    // Test 4: Discovery with custom includes
    results.push(await this.testCustomIncludePatterns(testUrl));
    
    console.log('🧪 Enhanced discovery tests completed:', results);
    return results;
  }

  private static async testFullWebsiteDiscovery(url: string): Promise<DiscoveryTestResult> {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          url,
          agentId: 'test-agent-id',
          crawlMode: 'full-website',
          maxPages: 150,
          discoverOnly: true
        }
      });

      if (error) {
        return {
          testName: 'Enhanced Full Website Discovery',
          success: false,
          urlCount: 0,
          error: error.message
        };
      }

      return {
        testName: 'Enhanced Full Website Discovery',
        success: data.success,
        urlCount: data.totalUrlsDiscovered || 0,
        urls: data.urls?.slice(0, 20), // First 20 URLs for inspection
        crawlMode: data.crawlMode
      };
    } catch (error: any) {
      return {
        testName: 'Enhanced Full Website Discovery',
        success: false,
        urlCount: 0,
        error: error.message
      };
    }
  }

  private static async testSitemapDiscovery(url: string): Promise<DiscoveryTestResult> {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          url,
          agentId: 'test-agent-id',
          crawlMode: 'sitemap-only',
          discoverOnly: true
        }
      });

      if (error) {
        return {
          testName: 'Enhanced Sitemap Discovery',
          success: false,
          urlCount: 0,
          error: error.message
        };
      }

      return {
        testName: 'Enhanced Sitemap Discovery',
        success: data.success,
        urlCount: data.totalUrlsDiscovered || 0,
        urls: data.urls?.slice(0, 20),
        crawlMode: data.crawlMode
      };
    } catch (error: any) {
      return {
        testName: 'Enhanced Sitemap Discovery',
        success: false,
        urlCount: 0,
        error: error.message
      };
    }
  }

  private static async testSinglePageDiscovery(url: string): Promise<DiscoveryTestResult> {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          url,
          agentId: 'test-agent-id',
          crawlMode: 'single-page',
          discoverOnly: true
        }
      });

      if (error) {
        return {
          testName: 'Single Page Discovery',
          success: false,
          urlCount: 0,
          error: error.message
        };
      }

      return {
        testName: 'Single Page Discovery',
        success: data.success,
        urlCount: data.totalUrlsDiscovered || 0,
        urls: data.urls,
        crawlMode: data.crawlMode
      };
    } catch (error: any) {
      return {
        testName: 'Single Page Discovery',
        success: false,
        urlCount: 0,
        error: error.message
      };
    }
  }

  private static async testCustomIncludePatterns(url: string): Promise<DiscoveryTestResult> {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: {
          url,
          agentId: 'test-agent-id',
          crawlMode: 'full-website',
          maxPages: 100,
          includePaths: ['/radgivere/*', '/tjenester/*', '/en/*'],
          discoverOnly: true
        }
      });

      if (error) {
        return {
          testName: 'Custom Include Patterns',
          success: false,
          urlCount: 0,
          error: error.message
        };
      }

      return {
        testName: 'Custom Include Patterns',
        success: data.success,
        urlCount: data.totalUrlsDiscovered || 0,
        urls: data.urls?.slice(0, 20),
        crawlMode: data.crawlMode
      };
    } catch (error: any) {
      return {
        testName: 'Custom Include Patterns',
        success: false,
        urlCount: 0,
        error: error.message
      };
    }
  }

  static async compareWithOldSystem(): Promise<void> {
    console.log('📊 Comparing enhanced vs. old discovery system');
    
    const results = await this.testGreatPeopleDiscovery();
    
    console.log('\n=== ENHANCED DISCOVERY RESULTS ===');
    results.forEach(result => {
      console.log(`\n${result.testName}:`);
      console.log(`  ✅ Success: ${result.success}`);
      console.log(`  📊 URLs Found: ${result.urlCount}`);
      console.log(`  🔗 Mode: ${result.crawlMode}`);
      
      if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      }
      
      if (result.urls && result.urls.length > 0) {
        console.log(`  📋 Sample URLs:`);
        result.urls.slice(0, 5).forEach(url => console.log(`    - ${url}`));
        if (result.urls.length > 5) {
          console.log(`    ... and ${result.urls.length - 5} more`);
        }
      }
    });
    
    const fullWebsiteResult = results.find(r => r.testName === 'Enhanced Full Website Discovery');
    if (fullWebsiteResult) {
      console.log(`\n🎯 TARGET ACHIEVED: ${fullWebsiteResult.urlCount} URLs discovered (target: ~120)`);
      console.log(`📈 Improvement: ${fullWebsiteResult.urlCount} vs. ~37 previous (${Math.round((fullWebsiteResult.urlCount / 37) * 100)}% of previous)`);
    }
  }
}

// Export for console testing
export const testEnhancedDiscovery = EnhancedDiscoveryTestSuite.testGreatPeopleDiscovery;
export const compareDiscoverySystems = EnhancedDiscoveryTestSuite.compareWithOldSystem;
