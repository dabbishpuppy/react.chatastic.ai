
import { supabase } from "@/integrations/supabase/client";

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: any;
}

export class MonitoringAndAlertingService {
  private static monitoringInterval: number | null = null;
  private static isRunning = false;
  private static alerts: SystemAlert[] = [];
  private static readonly MONITORING_INTERVAL = 15000; // 15 seconds

  static async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('📊 Monitoring already running');
      return;
    }

    console.log('📊 Starting monitoring and alerting service...');
    this.isRunning = true;

    // Initial check
    this.performSystemCheck();

    // Set up periodic monitoring
    this.monitoringInterval = window.setInterval(() => {
      this.performSystemCheck();
    }, this.MONITORING_INTERVAL);
  }

  static stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Stopped monitoring service');
  }

  private static async performSystemCheck(): Promise<void> {
    try {
      // Check for stalled jobs
      await this.checkForStalledJobs();
      
      // Check error rates
      await this.checkErrorRates();
      
      // Check system performance
      await this.checkSystemPerformance();

      // Clean up old resolved alerts
      this.cleanupOldAlerts();

    } catch (error) {
      console.error('❌ Error during system check:', error);
      this.createAlert('error', 'System monitoring check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private static async checkForStalledJobs(): Promise<void> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      // Check for stalled pending jobs
      const { data: stalledPending, error: pendingError } = await supabase
        .from('source_pages')
        .select('id, url, parent_source_id')
        .eq('status', 'pending')
        .lt('created_at', fiveMinutesAgo);

      if (!pendingError && stalledPending && stalledPending.length > 10) {
        this.createAlert('warning', `${stalledPending.length} jobs stalled in pending state`, {
          stalledJobs: stalledPending.length,
          type: 'pending_stall'
        });
      }

      // Check for stalled in-progress jobs
      const { data: stalledInProgress, error: inProgressError } = await supabase
        .from('source_pages')
        .select('id, url, parent_source_id')
        .eq('status', 'in_progress')
        .lt('started_at', tenMinutesAgo);

      if (!inProgressError && stalledInProgress && stalledInProgress.length > 5) {
        this.createAlert('error', `${stalledInProgress.length} jobs stuck in processing`, {
          stalledJobs: stalledInProgress.length,
          type: 'processing_timeout'
        });
      }

    } catch (error) {
      console.error('❌ Error checking for stalled jobs:', error);
    }
  }

  private static async checkErrorRates(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: recentJobs, error } = await supabase
        .from('source_pages')
        .select('status')
        .gte('updated_at', oneHourAgo);

      if (!error && recentJobs && recentJobs.length > 10) {
        const failedCount = recentJobs.filter(job => job.status === 'failed').length;
        const errorRate = failedCount / recentJobs.length;

        if (errorRate > 0.3) { // >30% error rate
          this.createAlert('critical', `High error rate detected: ${(errorRate * 100).toFixed(1)}%`, {
            errorRate: errorRate,
            failedJobs: failedCount,
            totalJobs: recentJobs.length
          });
        } else if (errorRate > 0.15) { // >15% error rate
          this.createAlert('warning', `Elevated error rate: ${(errorRate * 100).toFixed(1)}%`, {
            errorRate: errorRate,
            failedJobs: failedCount,
            totalJobs: recentJobs.length
          });
        }
      }

    } catch (error) {
      console.error('❌ Error checking error rates:', error);
    }
  }

  private static async checkSystemPerformance(): Promise<void> {
    try {
      // Check processing throughput
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: recentCompleted, error } = await supabase
        .from('source_pages')
        .select('id')
        .eq('status', 'completed')
        .gte('completed_at', fiveMinutesAgo);

      if (!error) {
        const throughput = recentCompleted?.length || 0;
        
        if (throughput < 2) { // Less than 2 jobs completed in 5 minutes
          this.createAlert('warning', 'Low processing throughput detected', {
            throughput: throughput,
            timeWindow: '5 minutes'
          });
        }
      }

    } catch (error) {
      console.error('❌ Error checking system performance:', error);
    }
  }

  private static createAlert(type: 'warning' | 'error' | 'critical', message: string, metadata?: any): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(alert => 
      !alert.resolved && alert.message === message && alert.type === type
    );

    if (existingAlert) {
      // Update timestamp of existing alert
      existingAlert.timestamp = new Date().toISOString();
      existingAlert.metadata = { ...existingAlert.metadata, ...metadata };
      return;
    }

    const alert: SystemAlert = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date().toISOString(),
      resolved: false,
      metadata
    };

    this.alerts.push(alert);
    console.log(`🚨 ALERT [${type.toUpperCase()}]: ${message}`, metadata);

    // Auto-resolve warning alerts after 10 minutes
    if (type === 'warning') {
      setTimeout(() => {
        this.resolveAlert(alert.id);
      }, 10 * 60 * 1000);
    }
  }

  private static resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ Alert resolved: ${alert.message}`);
    }
  }

  private static cleanupOldAlerts(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.alerts = this.alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      return !alert.resolved || alertTime > oneHourAgo;
    });
  }

  static getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  static getAllAlerts(): SystemAlert[] {
    return [...this.alerts];
  }

  static async getSystemHealthSummary(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    activeAlerts: number;
    criticalAlerts: number;
    lastCheck: string;
  }> {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(alert => alert.type === 'critical');
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (activeAlerts.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      lastCheck: new Date().toISOString()
    };
  }
}
