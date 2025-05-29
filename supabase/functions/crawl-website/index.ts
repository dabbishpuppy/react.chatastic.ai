
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function crawlWebsite(sourceId: string, url: string, crawlType: string) {
  console.log(`Starting crawl for ${url} with type ${crawlType}`);
  
  try {
    // Update status to in_progress
    await supabase
      .from('agent_sources')
      .update({ 
        crawl_status: 'in_progress', 
        progress: 10,
        last_crawled_at: new Date().toISOString()
      })
      .eq('id', sourceId);

    // Get the source to access agent_id and team_id
    const { data: source } = await supabase
      .from('agent_sources')
      .select('agent_id, team_id, metadata')
      .eq('id', sourceId)
      .single();

    if (!source) {
      throw new Error('Source not found');
    }

    // Simulate crawling process with real-time updates
    let discoveredLinks: string[] = [];
    
    if (crawlType === 'individual-link') {
      // For individual links, just process the single URL
      discoveredLinks = [url];
    } else if (crawlType === 'sitemap') {
      // For sitemap, fetch and parse the sitemap
      discoveredLinks = await fetchSitemapLinks(url);
    } else {
      // For crawl-links, discover links from the page
      discoveredLinks = await discoverLinksFromPage(url, source.metadata);
    }

    console.log(`Discovered ${discoveredLinks.length} links`);

    // Update progress to 50%
    await supabase
      .from('agent_sources')
      .update({ 
        progress: 50,
        links_count: discoveredLinks.length
      })
      .eq('id', sourceId);

    // Create child sources for discovered links
    const childSources = discoveredLinks.map((link, index) => ({
      agent_id: source.agent_id,
      team_id: source.team_id,
      source_type: 'website' as const,
      title: link,
      url: link,
      parent_source_id: sourceId,
      crawl_status: 'completed',
      metadata: {
        crawlType: 'individual-link',
        parentUrl: url,
        discoveredAt: new Date().toISOString()
      },
      created_by: null
    }));

    // Insert child sources in batches
    if (childSources.length > 0) {
      await supabase
        .from('agent_sources')
        .insert(childSources);
    }

    // Update progress to 90%
    await supabase
      .from('agent_sources')
      .update({ progress: 90 })
      .eq('id', sourceId);

    // Final update - mark as completed
    await supabase
      .from('agent_sources')
      .update({ 
        crawl_status: 'completed',
        progress: 100,
        links_count: discoveredLinks.length,
        last_crawled_at: new Date().toISOString()
      })
      .eq('id', sourceId);

    console.log(`Crawl completed for ${url}`);
    
  } catch (error) {
    console.error(`Crawl failed for ${url}:`, error);
    
    // Update status to failed
    await supabase
      .from('agent_sources')
      .update({ 
        crawl_status: 'failed',
        metadata: {
          error: error.message,
          failedAt: new Date().toISOString()
        }
      })
      .eq('id', sourceId);
  }
}

async function fetchSitemapLinks(sitemapUrl: string): Promise<string[]> {
  try {
    const response = await fetch(sitemapUrl);
    const sitemapContent = await response.text();
    
    // Simple XML parsing to extract URLs
    const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
    if (!urlMatches) return [];
    
    return urlMatches
      .map(match => match.replace(/<\/?loc>/g, ''))
      .filter(url => url.startsWith('http'))
      .slice(0, 50); // Limit to 50 URLs
  } catch (error) {
    console.error('Error fetching sitemap:', error);
    return [];
  }
}

async function discoverLinksFromPage(url: string, metadata: any): Promise<string[]> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Simple regex to find links
    const linkMatches = html.match(/href=["'](https?:\/\/[^"']+)["']/g);
    if (!linkMatches) return [];
    
    let links = linkMatches
      .map(match => match.replace(/href=["']/, '').replace(/["']$/, ''))
      .filter(link => {
        // Basic filtering
        if (!link.startsWith('http')) return false;
        if (link.includes('#')) return false;
        if (link.match(/\.(jpg|jpeg|png|gif|pdf|zip|exe)$/i)) return false;
        return true;
      });

    // Apply include/exclude filters from metadata
    const includePaths = metadata?.includePaths || [];
    const excludePaths = metadata?.excludePaths || [];

    if (includePaths.length > 0) {
      links = links.filter(link => 
        includePaths.some((pattern: string) => 
          link.includes(pattern.replace('*', ''))
        )
      );
    }

    if (excludePaths.length > 0) {
      links = links.filter(link => 
        !excludePaths.some((pattern: string) => 
          link.includes(pattern.replace('*', ''))
        )
      );
    }

    // Remove duplicates and limit
    return [...new Set(links)].slice(0, 25);
    
  } catch (error) {
    console.error('Error discovering links:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source_id, url, crawl_type } = await req.json();
    
    console.log('Received crawl request:', { source_id, url, crawl_type });

    // Start crawling in the background
    EdgeRuntime.waitUntil(crawlWebsite(source_id, url, crawl_type));

    return new Response(
      JSON.stringify({ message: 'Crawling started' }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in crawl-website function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
