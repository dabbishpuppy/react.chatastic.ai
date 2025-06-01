
import { supabase } from "@/integrations/supabase/client";

export interface Alert {
  id: string;
  type: 'performance' | 'error' | 'capacity' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  metadata: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  threshold: number;
  severity: Alert['severity'];
  enabled: boolean;
  cooldownMinutes: number;
  notificationChannels: string[];
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'slack';
  config: any;
  enabled: boolean;
}

export class AlertingService {
  private static activeAlerts: Map<string, Alert> = new Map();
  private static alertRules: AlertRule[] = [];
  private static notificationChannels: NotificationChannel[] = [];
  private static isInitialized = false;

  // Initialize the alerting service
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚨 Initializing alerting service...');

    // Load default alert rules
    this.alertRules = this.getDefaultAlertRules();
    
    // Load default notification channels
    this.notificationChannels = this.getDefaultNotificationChannels();

    this.isInitialized = true;
    console.log('✅ Alerting service initialized');
  }

  // Create a new alert
  static async createAlert(alertData: {
    type: Alert['type'];
    severity: Alert['severity'];
    title: string;
    message: string;
    source: string;
    metadata?: any;
  }): Promise<Alert> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: alertData.type,
      severity: alertData.severity,
      title: alertData.title,
      message: alertData.message,
      source: alertData.source,
      metadata: alertData.metadata || {},
      acknowledged: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store alert
    this.activeAlerts.set(alert.id, alert);

    // Send notifications
    await this.sendNotifications(alert);

    console.log(`🚨 Alert created: [${alert.severity.toUpperCase()}] ${alert.title}`);
    return alert;
  }

  // Acknowledge an alert
  static async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.acknowledged) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();
    alert.updatedAt = new Date().toISOString();

    this.activeAlerts.set(alertId, alert);

    console.log(`✅ Alert acknowledged: ${alert.title} by ${acknowledgedBy}`);
    return true;
  }

  // Resolve an alert
  static async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolvedAt = new Date().toISOString();
    alert.updatedAt = new Date().toISOString();

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    console.log(`✅ Alert resolved: ${alert.title}`);
    return true;
  }

  // Get all active alerts
  static getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  // Get alerts by severity
  static getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.severity === severity);
  }

  // Get critical alerts count
  static getCriticalAlertsCount(): number {
    return this.getAlertsBySeverity('critical').length;
  }

  // Send notifications for an alert
  private static async sendNotifications(alert: Alert): Promise<void> {
    const enabledChannels = this.notificationChannels.filter(channel => channel.enabled);

    for (const channel of enabledChannels) {
      try {
        await this.sendNotificationToChannel(alert, channel);
      } catch (error) {
        console.error(`Failed to send notification to ${channel.name}:`, error);
      }
    }
  }

  // Send notification to a specific channel
  private static async sendNotificationToChannel(alert: Alert, channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(alert, channel);
        break;
      case 'webhook':
        await this.sendWebhookNotification(alert, channel);
        break;
      case 'slack':
        await this.sendSlackNotification(alert, channel);
        break;
      default:
        console.warn(`Unknown notification channel type: ${channel.type}`);
    }
  }

  // Send email notification
  private static async sendEmailNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    console.log(`📧 Sending email notification for alert: ${alert.title}`);
    // Implementation would integrate with email service
  }

  // Send webhook notification
  private static async sendWebhookNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    console.log(`🔗 Sending webhook notification for alert: ${alert.title}`);
    
    try {
      await fetch(channel.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...channel.config.headers
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  }

  // Send Slack notification
  private static async sendSlackNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    console.log(`💬 Sending Slack notification for alert: ${alert.title}`);
    
    const color = this.getSeverityColor(alert.severity);
    const slackMessage = {
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Source',
            value: alert.source,
            short: true
          },
          {
            title: 'Time',
            value: new Date(alert.createdAt).toLocaleString(),
            short: true
          }
        ]
      }]
    };

    try {
      await fetch(channel.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      });
    } catch (error) {
      console.error('Slack notification failed:', error);
    }
  }

  // Get severity color for notifications
  private static getSeverityColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical':
        return '#ff0000';
      case 'high':
        return '#ff9900';
      case 'medium':
        return '#ffcc00';
      case 'low':
        return '#00ff00';
      default:
        return '#cccccc';
    }
  }

  // Get default alert rules
  private static getDefaultAlertRules(): AlertRule[] {
    return [
      {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'CPU usage exceeds 80%',
        condition: 'cpu_usage > 80',
        threshold: 80,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 15,
        notificationChannels: ['email', 'slack']
      },
      {
        id: 'memory-high',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds 85%',
        condition: 'memory_usage > 85',
        threshold: 85,
        severity: 'high',
        enabled: true,
        cooldownMinutes: 15,
        notificationChannels: ['email', 'slack']
      },
      {
        id: 'disk-critical',
        name: 'Critical Disk Usage',
        description: 'Disk usage exceeds 90%',
        condition: 'disk_usage > 90',
        threshold: 90,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
        notificationChannels: ['email', 'slack', 'webhook']
      },
      {
        id: 'queue-backlog',
        name: 'Queue Backlog',
        description: 'Job queue has more than 1000 pending jobs',
        condition: 'queue_length > 1000',
        threshold: 1000,
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 30,
        notificationChannels: ['email']
      },
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5%',
        condition: 'error_rate > 5',
        threshold: 5,
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 10,
        notificationChannels: ['slack']
      }
    ];
  }

  // Get default notification channels
  private static getDefaultNotificationChannels(): NotificationChannel[] {
    return [
      {
        id: 'email-admin',
        name: 'Admin Email',
        type: 'email',
        config: {
          recipients: ['admin@wonderwave.no'],
          subject: 'WonderWave Alert: {alert.title}'
        },
        enabled: true
      },
      {
        id: 'slack-alerts',
        name: 'Slack Alerts',
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL || ''
        },
        enabled: false // Disabled by default until webhook is configured
      },
      {
        id: 'webhook-monitoring',
        name: 'Monitoring Webhook',
        type: 'webhook',
        config: {
          url: process.env.MONITORING_WEBHOOK_URL || '',
          headers: {
            'Authorization': `Bearer ${process.env.MONITORING_TOKEN || ''}`
          }
        },
        enabled: false // Disabled by default until configured
      }
    ];
  }

  // Auto-resolve alerts based on conditions
  static async autoResolveAlerts(): Promise<void> {
    const alerts = this.getActiveAlerts();
    
    for (const alert of alerts) {
      // Auto-resolve based on alert type and current conditions
      const shouldResolve = await this.checkAutoResolveCondition(alert);
      
      if (shouldResolve) {
        await this.resolveAlert(alert.id);
      }
    }
  }

  // Check if an alert should be auto-resolved
  private static async checkAutoResolveCondition(alert: Alert): Promise<boolean> {
    // This would check current system state against the alert condition
    // For now, auto-resolve alerts older than 1 hour if they're not critical
    if (alert.severity !== 'critical') {
      const alertAge = Date.now() - new Date(alert.createdAt).getTime();
      return alertAge > 60 * 60 * 1000; // 1 hour
    }
    
    return false;
  }
}
