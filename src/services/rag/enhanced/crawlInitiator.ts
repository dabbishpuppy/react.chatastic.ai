
import { supabase } from "@/integrations/supabase/client";
import { CircuitBreaker } from './circuitBreaker';
import { JobManager } from './jobManager';
import type { CrawlOptions, CrawlResult } from './types/crawlHealthTypes';

export class CrawlInitiator {
  static async initiateCrawlWithResilience(
    url: string,
    options: CrawlOptions
  ): Promise<CrawlResult> {
    return await CircuitBreaker.executeWithBreaker(
      'enhanced-crawl',
      async () => {
        const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
          body: { url, ...options }
        });

        if (error) {
          throw new Error(`Crawl failed: ${error.message}`);
        }

        if (data.parentSourceId) {
          await JobManager.ensureJobsCreated(data.parentSourceId);
        }

        return {
          success: true,
          parentSourceId: data.parentSourceId
        };
      },
      async () => {
        return await this.fallbackCrawl(url, options);
      }
    );
  }

  private static async fallbackCrawl(url: string, options: CrawlOptions): Promise<CrawlResult> {
    console.log('⚡ Using enhanced fallback crawl method for:', url);
    
    const { agentId, teamId } = options;
    
    if (!agentId || !teamId) {
      throw new Error('Missing required agentId or teamId for fallback crawl');
    }
    
    // Create a basic source entry
    const { data: source, error } = await supabase
      .from('agent_sources')
      .insert({
        agent_id: agentId,
        team_id: teamId,
        url,
        title: url,
        source_type: 'website',
        crawl_status: 'pending',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create a single source page with all required fields
    const { data: page, error: pageError } = await supabase
      .from('source_pages')
      .insert({
        parent_source_id: source.id,
        customer_id: teamId,
        url: url,
        status: 'pending'
      })
      .select()
      .single();

    if (!pageError && page) {
      await supabase
        .from('background_jobs')
        .insert({
          job_type: 'process_page',
          source_id: source.id,
          page_id: page.id,
          job_key: `fallback:${page.id}`,
          payload: { childJobId: page.id, url: url },
          priority: 100
        });
    }

    return {
      success: true,
      parentSourceId: source.id
    };
  }
}
