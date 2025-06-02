
import { ServiceStatus } from './types';

export class HealthMonitor {
  static async performHealthCheck(
    services: Map<string, ServiceStatus>,
    startTime: number,
    updateServiceCallback: (name: string, updatedService: ServiceStatus) => void
  ): Promise<void> {
    for (const [serviceName, service] of services.entries()) {
      if (service.status === 'running') {
        try {
          // Update uptime
          const uptimeMs = Date.now() - startTime;
          const updatedService = {
            ...service,
            uptime: Math.floor(uptimeMs / 1000),
            lastCheck: new Date().toISOString(),
            health: this.calculateServiceHealth(serviceName)
          };
          
          updateServiceCallback(serviceName, updatedService);
        } catch (error) {
          console.error(`Health check failed for ${serviceName}:`, error);
          const errorService = { ...service, status: 'error' as const };
          updateServiceCallback(serviceName, errorService);
        }
      }
    }
  }

  static calculateServiceHealth(serviceName: string): number {
    // Simple health calculation - can be enhanced with actual metrics
    const baseHealth = 100;
    const randomVariation = Math.random() * 10 - 5; // ±5%
    return Math.max(0, Math.min(100, baseHealth + randomVariation));
  }

  static startHealthMonitoring(
    checkInterval: number,
    isRunning: () => boolean,
    services: Map<string, ServiceStatus>,
    startTime: number,
    updateServiceCallback: (name: string, updatedService: ServiceStatus) => void
  ): NodeJS.Timeout {
    return setInterval(() => {
      if (isRunning()) {
        this.performHealthCheck(services, startTime, updateServiceCallback);
      }
    }, checkInterval);
  }
}
