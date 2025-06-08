
export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'console';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

export class AlertingService {
  private static rules = new Map<string, AlertRule>();
  private static activeAlerts = new Map<string, Alert>();
  private static notificationChannels = new Map<string, NotificationChannel>();
  private static alertHistory: Alert[] = [];

  static initialize(): void {
    console.log('🚨 Initializing alerting service...');
    
    // Set up default notification channels
    this.setupDefaultNotificationChannels();
    
    // Set up default alert rules
    this.setupDefaultAlertRules();
    
    console.log('✅ Alerting service initialized');
  }

  private static setupDefaultNotificationChannels(): void {
    const defaultChannels = this.getDefaultNotificationChannels();
    
    defaultChannels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });
  }

  private static setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_response_time',
        name: 'High Response Time',
        metric: 'response_time',
        condition: 'greater_than',
        threshold: 5000,
        severity: 'high',
        enabled: true
      },
      {
        id: 'low_relevance_score',
        name: 'Low Relevance Score',
        metric: 'relevance_score',
        condition: 'less_than',
        threshold: 0.6,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'memory_usage_high',
        name: 'High Memory Usage',
        metric: 'memory_usage',
        condition: 'greater_than',
        threshold: 90,
        severity: 'critical',
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  static triggerAlert(ruleId: string, message: string, severity: Alert['severity']): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: Alert = {
      id: alertId,
      ruleId,
      message,
      severity,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false
    };

    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);

    console.log(`🚨 Alert triggered: ${message} (${severity})`);
    
    // Send notifications
    this.sendNotifications(alert);
  }

  private static sendNotifications(alert: Alert): void {
    const enabledChannels = Array.from(this.notificationChannels.values())
      .filter(channel => channel.enabled);

    enabledChannels.forEach(channel => {
      this.sendNotification(channel, alert);
    });
  }

  private static sendNotification(channel: NotificationChannel, alert: Alert): void {
    switch (channel.type) {
      case 'console':
        console.log(`📢 [${channel.name}] Alert: ${alert.message} (${alert.severity})`);
        break;
      case 'email':
        console.log(`📧 [${channel.name}] Would send email alert: ${alert.message}`);
        break;
      case 'slack':
        console.log(`💬 [${channel.name}] Would send Slack alert: ${alert.message}`);
        break;
      case 'webhook':
        console.log(`🔗 [${channel.name}] Would send webhook alert: ${alert.message}`);
        break;
    }
  }

  static acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`✅ Alert acknowledged: ${alertId}`);
    }
  }

  static resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.activeAlerts.delete(alertId);
      console.log(`🔧 Alert resolved: ${alertId}`);
    }
  }

  static getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static addAlertRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    console.log(`📋 Alert rule added: ${rule.name}`);
  }

  static removeAlertRule(ruleId: string): void {
    this.rules.delete(ruleId);
    console.log(`🗑️ Alert rule removed: ${ruleId}`);
  }

  static getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  static addNotificationChannel(channel: NotificationChannel): void {
    this.notificationChannels.set(channel.id, channel);
    console.log(`📢 Notification channel added: ${channel.name}`);
  }

  static removeNotificationChannel(channelId: string): void {
    this.notificationChannels.delete(channelId);
    console.log(`🗑️ Notification channel removed: ${channelId}`);
  }

  static getAllChannels(): NotificationChannel[] {
    return Array.from(this.notificationChannels.values());
  }

  static checkMetricThresholds(metrics: Record<string, number>): void {
    const enabledRules = Array.from(this.rules.values()).filter(rule => rule.enabled);

    enabledRules.forEach(rule => {
      const metricValue = metrics[rule.metric];
      if (metricValue !== undefined) {
        let shouldAlert = false;

        switch (rule.condition) {
          case 'greater_than':
            shouldAlert = metricValue > rule.threshold;
            break;
          case 'less_than':
            shouldAlert = metricValue < rule.threshold;
            break;
          case 'equals':
            shouldAlert = metricValue === rule.threshold;
            break;
        }

        if (shouldAlert) {
          this.triggerAlert(
            rule.id,
            `${rule.name}: ${rule.metric} is ${metricValue} (threshold: ${rule.threshold})`,
            rule.severity
          );
        }
      }
    });
  }

  private static getDefaultNotificationChannels(): NotificationChannel[] {
    return [
      {
        id: 'console',
        type: 'console',
        name: 'Console Logger',
        config: {},
        enabled: true
      },
      {
        id: 'email_default',
        type: 'email',
        name: 'Default Email',
        config: {
          recipients: ['admin@example.com']
        },
        enabled: false
      }
    ];
  }
}
