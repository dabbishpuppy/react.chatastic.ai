
import { supabase } from "@/integrations/supabase/client";
import { JobRecoveryService } from './jobRecoveryService';
import { ConcurrentJobProcessor } from './concurrentJobProcessor';

export interface JobHealthMetrics {
  queueHealth: {
    totalPending: number;
    totalProcessing: number;
    totalFailed: number;
    oldestPendingAge: number;
    avgQueueWaitTime: number;
  };
  processingHealth: {
    activeWorkers: number;
    avgProcessingTime: number;
    successRate: number;
    throughputPerMinute: number;
  };
  systemHealth: {
    stalledJobs: number;
    orphanedPages: number;
    lastRecoveryTime: string | null;
    overallStatus: 'healthy' | 'warning' | 'critical';
  };
}

export class JobHealthMonitor {
  private static monitoringInterval: number | null = null;
  private static readonly HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds
  private static readonly AUTO_RECOVERY_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Start continuous health monitoring
   */
  static startMonitoring(): void {
    if (this.monitoringInterval) {
      console.log('📊 Health monitoring already running');
      return;
    }

    console.log('🏥 Starting job health monitoring...');
    
    // Initial health check
    this.performHealthCheck();
    
    // Set up periodic monitoring
    this.monitoringInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);

    // Set up automatic recovery
    setInterval(() => {
      this.performAutoRecovery();
    }, this.AUTO_RECOVERY_INTERVAL);
  }

  /**
   * Stop health monitoring
   */
  static stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Stopped job health monitoring');
    }
  }

  /**
   * Perform comprehensive health check
   */
  static async performHealthCheck(): Promise<JobHealthMetrics> {
    try {
      console.log('🔍 Performing job health check...');

      const [queueHealth, processingHealth, systemHealth] = await Promise.all([
        this.getQueueHealth(),
        this.getProcessingHealth(),
        this.getSystemHealth()
      ]);

      const metrics: JobHealthMetrics = {
        queueHealth,
        processingHealth,
        systemHealth
      };

      // Determine overall system status
      metrics.systemHealth.overallStatus = this.determineOverallStatus(metrics);

      console.log('📊 Health check completed:', {
        status: metrics.systemHealth.overallStatus,
        pending: metrics.queueHealth.totalPending,
        processing: metrics.queueHealth.totalProcessing,
        stalled: metrics.systemHealth.stalledJobs
      });

      return metrics;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get queue health metrics with proper error handling
   */
  private static async getQueueHealth() {
    try {
      const [pendingResult, processingResult, failedResult] = await Promise.all([
        supabase.from('background_jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('background_jobs').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
        supabase.from('background_jobs').select('*', { count: 'exact', head: true }).eq('status', 'failed')
      ]);

      // Get oldest pending job with proper error handling
      const { data: oldestPending } = await supabase
        .from('background_jobs')
        .select('created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single to avoid 406 errors

      const oldestPendingAge = oldestPending 
        ? Date.now() - new Date(oldestPending.created_at).getTime()
        : 0;

      // Calculate average queue wait time from recent completed jobs
      const { data: recentCompleted } = await supabase
        .from('background_jobs')
        .select('created_at, started_at')
        .eq('status', 'completed')
        .gte('completed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .not('started_at', 'is', null);

      let avgQueueWaitTime = 0;
      if (recentCompleted && recentCompleted.length > 0) {
        const waitTimes = recentCompleted.map(job => 
          new Date(job.started_at!).getTime() - new Date(job.created_at).getTime()
        );
        avgQueueWaitTime = waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;
      }

      return {
        totalPending: pendingResult.count || 0,
        totalProcessing: processingResult.count || 0,
        totalFailed: failedResult.count || 0,
        oldestPendingAge,
        avgQueueWaitTime
      };

    } catch (error) {
      console.error('❌ Error getting queue health:', error);
      return {
        totalPending: 0,
        totalProcessing: 0,
        totalFailed: 0,
        oldestPendingAge: 0,
        avgQueueWaitTime: 0
      };
    }
  }

  /**
   * Get processing health metrics
   */
  private static async getProcessingHealth() {
    try {
      // Get processing stats with fallback
      let stats;
      try {
        stats = await ConcurrentJobProcessor.getProcessingStats();
      } catch (error) {
        console.warn('Could not get processing stats, using defaults:', error);
        stats = {
          activeWorkers: 0,
          avgProcessingTime: 0,
          successRate: 1.0
        };
      }
      
      // Calculate throughput per minute
      const { data: recentJobs } = await supabase
        .from('background_jobs')
        .select('completed_at')
        .eq('status', 'completed')
        .gte('completed_at', new Date(Date.now() - 60 * 1000).toISOString()); // Last minute

      const throughputPerMinute = recentJobs?.length || 0;

      return {
        activeWorkers: stats.activeWorkers,
        avgProcessingTime: stats.avgProcessingTime,
        successRate: stats.successRate,
        throughputPerMinute
      };

    } catch (error) {
      console.error('❌ Error getting processing health:', error);
      return {
        activeWorkers: 0,
        avgProcessingTime: 0,
        successRate: 0,
        throughputPerMinute: 0
      };
    }
  }

  /**
   * Get system health metrics
   */
  private static async getSystemHealth() {
    try {
      // Get recovery stats with fallback
      let recoveryStats;
      try {
        recoveryStats = await JobRecoveryService.getRecoveryStats();
      } catch (error) {
        console.warn('Could not get recovery stats, using defaults:', error);
        recoveryStats = {
          stalledJobs: 0,
          oldestStalledJob: null,
          recoverySuccess: true
        };
      }
      
      // Check for orphaned pages (source_pages instead of just background_jobs)
      const { count: orphanedPages } = await supabase
        .from('source_pages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Older than 30 minutes

      return {
        stalledJobs: recoveryStats.stalledJobs,
        orphanedPages: orphanedPages || 0,
        lastRecoveryTime: null, // We'll track this separately
        overallStatus: 'healthy' as const
      };

    } catch (error) {
      console.error('❌ Error getting system health:', error);
      return {
        stalledJobs: 0,
        orphanedPages: 0,
        lastRecoveryTime: null,
        overallStatus: 'critical' as const
      };
    }
  }

  /**
   * Determine overall system status
   */
  private static determineOverallStatus(metrics: JobHealthMetrics): 'healthy' | 'warning' | 'critical' {
    const { queueHealth, processingHealth, systemHealth } = metrics;

    // Critical conditions
    if (
      systemHealth.stalledJobs > 10 ||
      systemHealth.orphanedPages > 20 ||
      queueHealth.oldestPendingAge > 30 * 60 * 1000 || // 30 minutes
      processingHealth.successRate < 0.5
    ) {
      return 'critical';
    }

    // Warning conditions
    if (
      systemHealth.stalledJobs > 0 ||
      systemHealth.orphanedPages > 5 ||
      queueHealth.oldestPendingAge > 10 * 60 * 1000 || // 10 minutes
      processingHealth.successRate < 0.8 ||
      queueHealth.totalPending > 50
    ) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Perform automatic recovery
   */
  private static async performAutoRecovery(): Promise<void> {
    try {
      console.log('🔧 Performing automatic recovery...');
      
      const metrics = await JobRecoveryService.recoverStalledJobs();
      
      if (metrics.recoveredJobs > 0) {
        console.log(`✅ Auto-recovery completed: ${metrics.recoveredJobs} jobs recovered`);
      }

    } catch (error) {
      console.error('❌ Auto-recovery failed:', error);
    }
  }

  /**
   * Get empty metrics for error cases
   */
  private static getEmptyMetrics(): JobHealthMetrics {
    return {
      queueHealth: {
        totalPending: 0,
        totalProcessing: 0,
        totalFailed: 0,
        oldestPendingAge: 0,
        avgQueueWaitTime: 0
      },
      processingHealth: {
        activeWorkers: 0,
        avgProcessingTime: 0,
        successRate: 0,
        throughputPerMinute: 0
      },
      systemHealth: {
        stalledJobs: 0,
        orphanedPages: 0,
        lastRecoveryTime: null,
        overallStatus: 'critical'
      }
    };
  }

  /**
   * Get current health status
   */
  static async getCurrentHealth(): Promise<JobHealthMetrics> {
    return await this.performHealthCheck();
  }
}
