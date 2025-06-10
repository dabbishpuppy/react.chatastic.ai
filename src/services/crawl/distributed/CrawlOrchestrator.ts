
import { DistributedCrawlQueue } from './DistributedCrawlQueue';
import { CrawlWorker } from './CrawlWorker';
import { CrawlProgressPublisher } from './CrawlProgressPublisher';
import { DomainRateLimiter } from './DomainRateLimiter';
import { supabase } from '@/integrations/supabase/client';

export interface CrawlInitiationRequest {
  parentSourceId: string;
  agentId: string;
  url: string;
  crawlConfig?: {
    maxPages?: number;
    maxDepth?: number;
    excludePaths?: string[];
    includePaths?: string[];
    respectRobots?: boolean;
  };
  priority?: 'low' | 'normal' | 'high';
  userId?: string;
}

export interface CrawlSession {
  sessionId: string;
  parentSourceId: string;
  agentId: string;
  status: 'pending' | 'discovering' | 'crawling' | 'completed' | 'failed';
  totalPages: number;
  processedPages: number;
  failedPages: number;
  estimatedCompletion?: string;
  metadata: {
    domain: string;
    startedAt: string;
    completedAt?: string;
    crawlConfig: any;
  };
}

export class CrawlOrchestrator {
  private static readonly DEFAULT_BATCH_SIZE = 10;
  private static readonly MAX_BATCH_SIZE = 50;
  private static readonly MIN_BATCH_SIZE = 5;

  /**
   * Initiate a new crawl session
   */
  static async initiateCrawl(request: CrawlInitiationRequest): Promise<string> {
    console.log(`🚀 Initiating crawl for: ${request.url}`);

    const sessionId = `crawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const domain = new URL(request.url).hostname;

    try {
      // Create crawl session using existing tables
      const session = await this.createCrawlSession(sessionId, request, domain);
      
      // Start discovery phase
      await this.startDiscoveryPhase(session);
      
      return sessionId;

    } catch (error) {
      console.error(`❌ Failed to initiate crawl for ${request.url}:`, error);
      throw error;
    }
  }

  /**
   * Create a new crawl session using existing agent_sources table
   */
  private static async createCrawlSession(
    sessionId: string, 
    request: CrawlInitiationRequest, 
    domain: string
  ): Promise<CrawlSession> {
    const session: CrawlSession = {
      sessionId,
      parentSourceId: request.parentSourceId,
      agentId: request.agentId,
      status: 'pending',
      totalPages: 0,
      processedPages: 0,
      failedPages: 0,
      metadata: {
        domain,
        startedAt: new Date().toISOString(),
        crawlConfig: request.crawlConfig || {}
      }
    };

    // Update existing agent_sources record with session metadata
    const { error } = await supabase
      .from('agent_sources')
      .update({
        metadata: {
          sessionId,
          crawlStatus: session.status,
          domain,
          startedAt: new Date().toISOString(),
          crawlConfig: request.crawlConfig || {}
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', request.parentSourceId);

    if (error) {
      console.error('❌ Failed to create crawl session:', error);
      throw error;
    }

    console.log(`✅ Created crawl session: ${sessionId}`);
    return session;
  }

  /**
   * Start the discovery phase to find all URLs to crawl
   */
  private static async startDiscoveryPhase(session: CrawlSession): Promise<void> {
    console.log(`🔍 Starting discovery phase for session: ${session.sessionId}`);
    
    const progressPublisher = new CrawlProgressPublisher(session.parentSourceId);
    
    try {
      // Update session status
      await this.updateSessionStatus(session.sessionId, 'discovering');
      
      await progressPublisher.publishProgress({
        status: 'processing',
        progress: 10,
        message: 'Discovering pages to crawl...',
        metadata: {
          sessionId: session.sessionId,
          phase: 'discovery'
        }
      });

      // Discover URLs (this would call your existing URL discovery logic)
      const urls = await this.discoverUrls(session);
      
      console.log(`📋 Discovered ${urls.length} URLs for crawling`);
      
      // Update session with discovered URLs
      await this.updateSessionUrls(session.sessionId, urls);
      
      // Start crawling phase
      await this.startCrawlingPhase(session, urls);

    } catch (error) {
      console.error(`❌ Discovery failed for session ${session.sessionId}:`, error);
      
      await this.updateSessionStatus(session.sessionId, 'failed');
      await progressPublisher.publishFailed(
        error instanceof Error ? error.message : 'Discovery failed'
      );
      
      throw error;
    }
  }

  /**
   * Start the crawling phase by creating batches of work
   */
  private static async startCrawlingPhase(session: CrawlSession, urls: string[]): Promise<void> {
    console.log(`🕷️ Starting crawling phase for ${urls.length} URLs`);
    
    const progressPublisher = new CrawlProgressPublisher(session.parentSourceId);
    
    try {
      // Update session status
      await this.updateSessionStatus(session.sessionId, 'crawling');
      
      await progressPublisher.publishProgress({
        status: 'processing',
        progress: 20,
        message: `Starting to crawl ${urls.length} pages...`,
        metadata: {
          sessionId: session.sessionId,
          phase: 'crawling',
          totalPages: urls.length
        }
      });

      // Calculate optimal batch size based on system load
      const batchSize = await this.calculateOptimalBatchSize(urls.length);
      
      // Create batches and enqueue jobs
      const batches = this.createBatches(urls, batchSize);
      const jobIds: string[] = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        const jobId = await DistributedCrawlQueue.enqueueCrawlBatch({
          parentSourceId: session.parentSourceId,
          agentId: session.agentId,
          batchUrls: batch,
          priority: this.calculateBatchPriority(batch.length, batches.length),
          domain: session.metadata.domain,
          userId: session.metadata.crawlConfig.userId,
          metadata: {
            crawlConfig: session.metadata.crawlConfig,
            totalPages: urls.length,
            processedPages: 0
          }
        });
        
        jobIds.push(jobId);
      }
      
      console.log(`📋 Enqueued ${jobIds.length} batch jobs for session ${session.sessionId}`);
      
      // Start monitoring progress
      this.monitorCrawlProgress(session.sessionId, jobIds);

    } catch (error) {
      console.error(`❌ Failed to start crawling phase:`, error);
      
      await this.updateSessionStatus(session.sessionId, 'failed');
      await progressPublisher.publishFailed(
        error instanceof Error ? error.message : 'Crawling failed to start'
      );
      
      throw error;
    }
  }

  /**
   * Monitor crawl progress and update status
   */
  private static async monitorCrawlProgress(sessionId: string, jobIds: string[]): Promise<void> {
    const progressPublisher = new CrawlProgressPublisher(sessionId);
    
    const checkProgress = async () => {
      try {
        const { data: jobs, error } = await supabase
          .from('background_jobs')
          .select('id, status, payload')
          .in('id', jobIds);

        if (error) {
          console.error('❌ Failed to check job progress:', error);
          return;
        }

        const completed = jobs?.filter(j => j.status === 'completed').length || 0;
        const failed = jobs?.filter(j => j.status === 'failed').length || 0;
        const total = jobs?.length || 0;
        
        const progress = Math.round(((completed + failed) / total) * 100);
        
        if (completed + failed === total) {
          // All jobs completed
          if (failed === 0) {
            await this.updateSessionStatus(sessionId, 'completed');
            await progressPublisher.publishCompleted(completed, total);
          } else {
            await this.updateSessionStatus(sessionId, 'completed'); // Partial success
            await progressPublisher.publishCompleted(completed, total, {
              partialSuccess: true,
              failedJobs: failed
            });
          }
        } else {
          // Still in progress
          await progressPublisher.publishProgress({
            status: 'processing',
            progress: Math.max(progress, 30), // Ensure progress moves forward
            message: `Processing: ${completed}/${total} batches completed`,
            metadata: {
              sessionId,
              completedJobs: completed,
              failedJobs: failed,
              totalJobs: total
            }
          });
          
          // Schedule next check
          setTimeout(checkProgress, 5000);
        }

      } catch (error) {
        console.error('❌ Error monitoring crawl progress:', error);
        setTimeout(checkProgress, 10000); // Retry with longer delay
      }
    };

    // Start monitoring
    setTimeout(checkProgress, 2000);
  }

  /**
   * Discover URLs to crawl (placeholder - implement actual discovery logic)
   */
  private static async discoverUrls(session: CrawlSession): Promise<string[]> {
    // This would integrate with your existing URL discovery logic
    // For now, return a mock list
    const baseUrl = session.metadata.crawlConfig.url || 'https://example.com';
    
    // Simulate URL discovery
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock URLs
    return [
      baseUrl,
      `${baseUrl}/about`,
      `${baseUrl}/contact`,
      `${baseUrl}/services`,
      `${baseUrl}/blog`
    ];
  }

  /**
   * Calculate optimal batch size based on system load
   */
  private static async calculateOptimalBatchSize(totalUrls: number): Promise<number> {
    try {
      const metrics = await DistributedCrawlQueue.getQueueMetrics();
      
      // Adjust batch size based on queue depth and system load
      let batchSize = this.DEFAULT_BATCH_SIZE;
      
      if (metrics.pendingJobs > 100) {
        batchSize = this.MIN_BATCH_SIZE; // Smaller batches when queue is busy
      } else if (metrics.pendingJobs < 10) {
        batchSize = this.MAX_BATCH_SIZE; // Larger batches when queue is light
      }
      
      // Ensure we don't create unnecessary small batches
      if (totalUrls < batchSize * 2) {
        batchSize = Math.max(this.MIN_BATCH_SIZE, Math.ceil(totalUrls / 2));
      }
      
      console.log(`📊 Calculated optimal batch size: ${batchSize} (queue depth: ${metrics.pendingJobs})`);
      return batchSize;

    } catch (error) {
      console.error('❌ Failed to calculate optimal batch size, using default:', error);
      return this.DEFAULT_BATCH_SIZE;
    }
  }

  /**
   * Create batches of URLs
   */
  private static createBatches(urls: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      batches.push(urls.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Calculate priority for a batch
   */
  private static calculateBatchPriority(batchSize: number, totalBatches: number): 'low' | 'normal' | 'high' {
    // Small crawls get higher priority
    if (totalBatches <= 2) return 'high';
    if (batchSize <= 5) return 'high';
    if (totalBatches <= 10) return 'normal';
    return 'low';
  }

  /**
   * Update session status using agent_sources metadata
   */
  private static async updateSessionStatus(sessionId: string, status: CrawlSession['status']): Promise<void> {
    const { error } = await supabase
      .from('agent_sources')
      .update({
        metadata: {
          crawlStatus: status,
          lastUpdated: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('metadata->>sessionId', sessionId);

    if (error) {
      console.error('❌ Failed to update session status:', error);
    }
  }

  /**
   * Update session with discovered URLs
   */
  private static async updateSessionUrls(sessionId: string, urls: string[]): Promise<void> {
    const { error } = await supabase
      .from('agent_sources')
      .update({
        metadata: {
          discoveredUrls: urls.length,
          totalPages: urls.length
        },
        updated_at: new Date().toISOString()
      })
      .eq('metadata->>sessionId', sessionId);

    if (error) {
      console.error('❌ Failed to update session URLs:', error);
    }
  }

  /**
   * Get session status
   */
  static async getSessionStatus(sessionId: string): Promise<CrawlSession | null> {
    try {
      const { data, error } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('metadata->>sessionId', sessionId)
        .single();

      if (error) {
        console.error('❌ Failed to get session status:', error);
        return null;
      }

      const metadata = data.metadata as any;
      return {
        sessionId: metadata.sessionId,
        parentSourceId: data.id,
        agentId: data.agent_id,
        status: metadata.crawlStatus || 'pending',
        totalPages: metadata.totalPages || 0,
        processedPages: 0, // Would be calculated from job progress
        failedPages: 0,
        metadata: metadata
      };

    } catch (error) {
      console.error('❌ Error getting session status:', error);
      return null;
    }
  }
}
