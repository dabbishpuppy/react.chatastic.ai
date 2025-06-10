
import { DistributedCrawlQueue } from './DistributedCrawlQueue';
import { CrawlProgressPublisher } from './CrawlProgressPublisher';
import { DomainRateLimiter } from './DomainRateLimiter';

export interface CrawlInitiationRequest {
  parentSourceId: string;
  agentId: string;
  url: string;
  crawlConfig: {
    maxPages: number;
    maxDepth: number;
    excludePaths: string[];
    includePaths: string[];
    respectRobots: boolean;
  };
  priority: 'low' | 'normal' | 'high';
}

export interface CrawlSession {
  sessionId: string;
  parentSourceId: string;
  status: 'discovering' | 'crawling' | 'completed' | 'failed';
  progress: number;
  totalPages: number;
  processedPages: number;
  failedPages: number;
}

export class CrawlOrchestrator {
  private static sessions: Map<string, CrawlSession> = new Map();

  /**
   * Initiate a distributed crawl session
   */
  static async initiateCrawl(request: CrawlInitiationRequest): Promise<string> {
    const sessionId = `crawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 Starting distributed crawl session: ${sessionId}`);
    
    // Create session tracking
    const session: CrawlSession = {
      sessionId,
      parentSourceId: request.parentSourceId,
      status: 'discovering',
      progress: 0,
      totalPages: 0,
      processedPages: 0,
      failedPages: 0
    };
    
    this.sessions.set(sessionId, session);
    
    try {
      // Start the discovery phase
      await this.startDiscoveryPhase(request, sessionId);
      
      return sessionId;
      
    } catch (error) {
      console.error(`❌ Failed to initiate crawl for ${request.url}:`, error);
      
      // Update session status
      session.status = 'failed';
      this.sessions.set(sessionId, session);
      
      // Publish failure event
      const publisher = new CrawlProgressPublisher(request.parentSourceId);
      await publisher.publishFailed('Discovery failed');
      
      throw error;
    }
  }

  /**
   * Start the discovery phase to find URLs to crawl
   */
  private static async startDiscoveryPhase(request: CrawlInitiationRequest, sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    const publisher = new CrawlProgressPublisher(request.parentSourceId);
    
    try {
      console.log(`🔍 Starting discovery for ${request.url}`);
      
      // Publish discovery start
      await publisher.publishProgress({
        status: 'processing',
        progress: 10,
        message: 'Discovering pages to crawl...',
        metadata: {
          sessionId,
          phase: 'discovery'
        }
      });

      // Simple URL discovery - for now just use the base URL and some common paths
      const discoveredUrls = await this.discoverUrls(request.url, request.crawlConfig);
      
      console.log(`📋 Discovered ${discoveredUrls.length} URLs for crawling`);
      
      // Update session
      session.totalPages = discoveredUrls.length;
      session.status = 'crawling';
      this.sessions.set(sessionId, session);
      
      // Update source with discovery results  
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase
        .from('agent_sources')
        .update({
          metadata: {
            discoveredUrls: discoveredUrls.length,
            totalPages: discoveredUrls.length
          },
          updated_at: new Date().toISOString()
        })
        .eq('metadata->>sessionId', sessionId);

      // Publish discovery completion
      await publisher.publishProgress({
        status: 'processing',
        progress: 20,
        message: `Starting to crawl ${discoveredUrls.length} pages...`,
        metadata: {
          sessionId,
          phase: 'crawling',
          totalPages: discoveredUrls.length
        }
      });

      // Update source status
      await supabase
        .from('agent_sources')
        .update({
          metadata: {
            crawlStatus: 'crawling',
            lastUpdated: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('metadata->>sessionId', sessionId);

      // Start the crawling phase
      await this.startCrawlingPhase(request, sessionId, discoveredUrls);
      
    } catch (error) {
      console.error(`❌ Discovery failed for session ${sessionId}:`, error);
      
      // Update session status
      session.status = 'failed';
      this.sessions.set(sessionId, session);
      
      throw error;
    }
  }

  /**
   * Start the crawling phase
   */
  private static async startCrawlingPhase(
    request: CrawlInitiationRequest,
    sessionId: string,
    urls: string[]
  ): Promise<void> {
    const domain = new URL(request.url).hostname;
    
    try {
      // Enqueue crawl batch
      await DistributedCrawlQueue.enqueueCrawlBatch({
        parentSourceId: request.parentSourceId,
        agentId: request.agentId,
        batchUrls: urls,
        priority: request.priority,
        domain: domain,
        metadata: {
          crawlConfig: request.crawlConfig,
          totalPages: urls.length,
          processedPages: 0
        }
      });
      
      console.log(`✅ Crawl batch enqueued for session ${sessionId}`);
      
    } catch (error) {
      console.error(`❌ Failed to start crawling phase for session ${sessionId}:`, error);
      
      // Update source status to failed
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase
        .from('agent_sources')
        .update({
          metadata: {
            crawlStatus: 'failed',
            lastUpdated: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('metadata->>sessionId', sessionId);

      const publisher = new CrawlProgressPublisher(request.parentSourceId);
      await publisher.publishFailed('Crawling failed to start');
      
      throw new Error('Crawling failed to start');
    }
  }

  /**
   * Simple URL discovery
   */
  private static async discoverUrls(baseUrl: string, config: any): Promise<string[]> {
    const urls = new Set<string>([baseUrl]);
    
    // Add some common paths for discovery
    const commonPaths = ['/about', '/contact', '/services', '/blog'];
    const baseUrlObj = new URL(baseUrl);
    
    commonPaths.forEach(path => {
      const fullUrl = `${baseUrlObj.protocol}//${baseUrlObj.hostname}${path}`;
      urls.add(fullUrl);
    });
    
    return Array.from(urls).slice(0, config.maxPages || 10);
  }

  /**
   * Get session status
   */
  static async getSessionStatus(sessionId: string): Promise<CrawlSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Update session progress
   */
  static updateSessionProgress(sessionId: string, progress: Partial<CrawlSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, progress);
      this.sessions.set(sessionId, session);
    }
  }
}
