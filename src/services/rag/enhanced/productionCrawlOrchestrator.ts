
import { supabase } from "@/integrations/supabase/client";

export class ProductionCrawlOrchestrator {
  private static instance: ProductionCrawlOrchestrator | null = null;
  private static isRunning = false;
  private static healthCheckInterval: number | null = null;
  private static queueProcessInterval: number | null = null;
  private static recoveryInterval: number | null = null;

  private static readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private static readonly QUEUE_PROCESS_INTERVAL = 5000; // 5 seconds
  private static readonly RECOVERY_INTERVAL = 60000; // 1 minute

  static getInstance(): ProductionCrawlOrchestrator {
    if (!this.instance) {
      this.instance = new ProductionCrawlOrchestrator();
    }
    return this.instance;
  }

  async startOrchestrator(): Promise<void> {
    if (ProductionCrawlOrchestrator.isRunning) {
      console.log('🔄 Production crawl orchestrator already running');
      return;
    }

    console.log('🚀 Starting production crawl orchestrator for 2000 concurrent URLs...');
    ProductionCrawlOrchestrator.isRunning = true;

    // Start health monitoring
    ProductionCrawlOrchestrator.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, ProductionCrawlOrchestrator.HEALTH_CHECK_INTERVAL);

    // Start queue processing
    ProductionCrawlOrchestrator.queueProcessInterval = window.setInterval(() => {
      this.triggerQueueProcessing();
    }, ProductionCrawlOrchestrator.QUEUE_PROCESS_INTERVAL);

    // Start recovery service
    ProductionCrawlOrchestrator.recoveryInterval = window.setInterval(() => {
      this.triggerRecoveryService();
    }, ProductionCrawlOrchestrator.RECOVERY_INTERVAL);

    console.log('✅ Production crawl orchestrator started');
  }

  async stopOrchestrator(): Promise<void> {
    if (ProductionCrawlOrchestrator.healthCheckInterval) {
      clearInterval(ProductionCrawlOrchestrator.healthCheckInterval);
      ProductionCrawlOrchestrator.healthCheckInterval = null;
    }

    if (ProductionCrawlOrchestrator.queueProcessInterval) {
      clearInterval(ProductionCrawlOrchestrator.queueProcessInterval);
      ProductionCrawlOrchestrator.queueProcessInterval = null;
    }

    if (ProductionCrawlOrchestrator.recoveryInterval) {
      clearInterval(ProductionCrawlOrchestrator.recoveryInterval);
      ProductionCrawlOrchestrator.recoveryInterval = null;
    }

    ProductionCrawlOrchestrator.isRunning = false;
    console.log('🛑 Production crawl orchestrator stopped');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('crawl-health-monitor');
      
      if (error) {
        console.error('❌ Health check failed:', error);
        return;
      }

      if (!data.healthy) {
        console.warn('🚨 Health issues detected:', data.issues);
        // Health monitor automatically triggers recovery
      }
    } catch (error) {
      console.error('❌ Health check exception:', error);
    }
  }

  private async triggerQueueProcessing(): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('production-queue-manager');
      
      if (error && !error.message?.includes('409')) {
        console.error('❌ Queue processing failed:', error);
        return;
      }

      if (data?.metrics) {
        const { pendingJobs, queueHealth, throughput } = data.metrics;
        
        // Log metrics every 10th call to avoid spam
        if (Math.random() < 0.1) {
          console.log(`📊 Queue metrics - Pending: ${pendingJobs}, Health: ${queueHealth}, Throughput: ${throughput}/hour`);
        }

        // Trigger additional processing if queue is backing up
        if (pendingJobs > 500 && queueHealth !== 'healthy') {
          console.log('🔥 High queue load detected, triggering additional processing...');
          await this.scaleUpProcessing();
        }
      }
    } catch (error) {
      console.error('❌ Queue processing exception:', error);
    }
  }

  private async triggerRecoveryService(): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('crawl-recovery-service');
      
      if (error) {
        console.error('❌ Recovery service failed:', error);
        return;
      }

      if (data?.report) {
        const { orphanedPagesFound, jobsSpawned, stalledJobsRecovered } = data.report;
        
        if (orphanedPagesFound > 0 || stalledJobsRecovered > 0) {
          console.log(`🔧 Recovery completed - Orphaned: ${orphanedPagesFound}, Jobs spawned: ${jobsSpawned}, Recovered: ${stalledJobsRecovered}`);
        }
      }
    } catch (error) {
      console.error('❌ Recovery service exception:', error);
    }
  }

  private async scaleUpProcessing(): Promise<void> {
    try {
      // Trigger multiple queue processors concurrently for scale-up
      const scaleUpPromises = Array.from({ length: 3 }, (_, i) => 
        supabase.functions.invoke('production-queue-manager', {
          body: { 
            scaleUp: true,
            workerId: `scale-up-${i}`,
            priority: 'high'
          }
        })
      );

      await Promise.allSettled(scaleUpPromises);
      console.log('📈 Scale-up processing triggered');
    } catch (error) {
      console.error('❌ Scale-up processing failed:', error);
    }
  }

  async getOrchestratorStatus(): Promise<{
    isRunning: boolean;
    uptime: number;
    lastHealthCheck: Date;
    queueMetrics?: any;
  }> {
    return {
      isRunning: ProductionCrawlOrchestrator.isRunning,
      uptime: ProductionCrawlOrchestrator.isRunning ? Date.now() : 0,
      lastHealthCheck: new Date(),
      queueMetrics: await this.getLatestQueueMetrics()
    };
  }

  private async getLatestQueueMetrics(): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('production-queue-manager');
      return error ? null : data?.metrics;
    } catch (error) {
      return null;
    }
  }

  async forceRecovery(): Promise<void> {
    console.log('🔄 Forcing immediate recovery...');
    await this.triggerRecoveryService();
  }

  async emergencyReset(): Promise<void> {
    console.log('🚨 Emergency reset - resetting all stuck jobs...');
    
    try {
      // Reset all processing jobs that are stuck
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          started_at: null,
          error_message: 'Emergency reset by orchestrator',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'processing')
        .lt('started_at', fiveMinutesAgo);

      if (error) {
        console.error('❌ Emergency reset failed:', error);
        throw error;
      }

      console.log('✅ Emergency reset completed');
      
      // Trigger immediate processing
      await this.triggerQueueProcessing();
    } catch (error) {
      console.error('❌ Emergency reset failed:', error);
      throw error;
    }
  }
}
