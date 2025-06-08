
import { supabase } from "@/integrations/supabase/client";
import { JobRecoveryService } from './jobRecoveryService';
import { ConcurrentJobProcessor } from './concurrentJobProcessor';
import { fetchMaybeSingle, handleSupabaseError } from '@/utils/safeSupabaseQueries';
import type { BackgroundJob, SourcePage } from "@/types/database";

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

// Partial types for selected fields
type JobTimestampFields = Pick<BackgroundJob, 'created_at' | 'started_at'>;
type JobCompletedTimestampFields = Pick<BackgroundJob, 'completed_at'>;

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
   * Perform comprehensive health check with proper error handling
   */
  static async performHealthCheck(): Promise<JobHealthMetrics> {
    try {
      console.log('🔍 Performing job health check...');

      const [queueHealth, processingHealth, systemHealth] = await Promise.allSettled([
        this.getQueueHealth(),
        this.getProcessingHealth(),
        this.getSystemHealth()
      ]);

      const metrics: JobHealthMetrics = {
        queueHealth: queueHealth.status === 'fulfilled' ? queueHealth.value : this.getDefaultQueueHealth(),
        processingHealth: processingHealth.status === 'fulfilled' ? processingHealth.value : this.getDefaultProcessingHealth(),
        systemHealth: systemHealth.status === 'fulfilled' ? systemHealth.value : this.getDefaultSystemHealth()
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
   * Get queue health metrics with comprehensive error handling
   */
  private static async getQueueHealth() {
    try {
      // Use Promise.allSettled to handle individual query failures
      const [pendingResult, processingResult, failedResult] = await Promise.allSettled([
        supabase.from<BackgroundJob>('background_jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from<BackgroundJob>('background_jobs').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
        supabase.from<BackgroundJob>('background_jobs').select('*', { count: 'exact', head: true }).eq('status', 'failed')
      ]);

      // Extract counts with safe fallbacks
      const totalPending = pendingResult.status === 'fulfilled' ? (pendingResult.value.count || 0) : 0;
      const totalProcessing = processingResult.status === 'fulfilled' ? (processingResult.value.count || 0) : 0;
      const totalFailed = failedResult.status === 'fulfilled' ? (failedResult.value.count || 0) : 0;

      // Get oldest pending job safely
      let oldestPendingAge = 0;
      try {
        const oldestPending = await fetchMaybeSingle<Pick<BackgroundJob, 'created_at'>>(
          supabase
            .from<BackgroundJob>('background_jobs')
            .select('created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1),
          'getQueueHealth_oldestPending'
        );

        if (oldestPending?.created_at) {
          oldestPendingAge = Date.now() - new Date(oldestPending.created_at).getTime();
        }
      } catch (error) {
        console.warn('Could not fetch oldest pending job:', error);
      }

      // Calculate average queue wait time from recent completed jobs
      let avgQueueWaitTime = 0;
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentCompleted } = await supabase
          .from<BackgroundJob>('background_jobs')
          .select('created_at, started_at')
          .eq('status', 'completed')
          .gte('completed_at', oneHourAgo)
          .not('started_at', 'is', null)
          .limit(100); // Limit for performance

        if (recentCompleted && recentCompleted.length > 0) {
          const waitTimes = recentCompleted
            .filter((job: JobTimestampFields) => job.started_at && job.created_at)
            .map((job: JobTimestampFields) => new Date(job.started_at!).getTime() - new Date(job.created_at!).getTime());
          
          if (waitTimes.length > 0) {
            avgQueueWaitTime = waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;
          }
        }
      } catch (error) {
        console.warn('Could not calculate average queue wait time:', error);
      }

      return {
        totalPending,
        totalProcessing,
        totalFailed,
        oldestPendingAge,
        avgQueueWaitTime
      };

    } catch (error) {
      console.error('❌ Error getting queue health:', error);
      return this.getDefaultQueueHealth();
    }
  }

  /**
   * Get processing health metrics with error handling
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
          successRate: 1.0,
          totalProcessed: 0,
          totalFailed: 0
        };
      }
      
      // Calculate throughput per minute safely
      let throughputPerMinute = 0;
      try {
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
        const { data: recentJobs } = await supabase
          .from<BackgroundJob>('background_jobs')
          .select('completed_at')
          .eq('status', 'completed')
          .gte('completed_at', oneMinuteAgo);

        throughputPerMinute = recentJobs?.length || 0;
      } catch (error) {
        console.warn('Could not calculate throughput:', error);
      }

      return {
        activeWorkers: stats.activeWorkers || 0,
        avgProcessingTime: stats.avgProcessingTime || 0,
        successRate: stats.successRate || 0,
        throughputPerMinute
      };

    } catch (error) {
      console.error('❌ Error getting processing health:', error);
      return this.getDefaultProcessingHealth();
    }
  }

  /**
   * Get system health metrics with comprehensive error handling
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
      
      // Check for orphaned pages safely
      let orphanedPages = 0;
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from<SourcePage>('source_pages')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .lt('created_at', thirtyMinutesAgo);

        orphanedPages = count || 0;
      } catch (error) {
        console.warn('Could not check orphaned pages:', error);
      }

      return {
        stalledJobs: recoveryStats.stalledJobs || 0,
        orphanedPages,
        lastRecoveryTime: null, // We'll track this separately
        overallStatus: 'healthy' as const
      };

    } catch (error) {
      console.error('❌ Error getting system health:', error);
      return this.getDefaultSystemHealth();
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

  // Default fallback methods
  private static getDefaultQueueHealth() {
    return {
      totalPending: 0,
      totalProcessing: 0,
      totalFailed: 0,
      oldestPendingAge: 0,
      avgQueueWaitTime: 0
    };
  }

  private static getDefaultProcessingHealth() {
    return {
      activeWorkers: 0,
      avgProcessingTime: 0,
      successRate: 0,
      throughputPerMinute: 0
    };
  }

  private static getDefaultSystemHealth() {
    return {
      stalledJobs: 0,
      orphanedPages: 0,
      lastRecoveryTime: null,
      overallStatus: 'critical' as const
    };
  }

  /**
   * Get empty metrics for error cases
   */
  private static getEmptyMetrics(): JobHealthMetrics {
    return {
      queueHealth: this.getDefaultQueueHealth(),
      processingHealth: this.getDefaultProcessingHealth(),
      systemHealth: this.getDefaultSystemHealth()
    };
  }

  /**
   * Get current health status
   */
  static async getCurrentHealth(): Promise<JobHealthMetrics> {
    return await this.performHealthCheck();
  }
}
