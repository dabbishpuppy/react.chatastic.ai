
import { ServiceManager } from './services/serviceManager';
import type { ServiceStatus } from './types';

export class StatusTracker extends ServiceManager {
  // Inherit all methods from ServiceManager for backward compatibility
  
  // Additional methods specific to status tracking
  getServicesByStatus(status: ServiceStatus['status']): ServiceStatus[] {
    return this.getAllServices().filter(service => service.status === status);
  }

  getServiceStatus(serviceName: string): ServiceStatus | null {
    return this.getService(serviceName);
  }

  getServiceUptime(serviceName: string): number {
    const service = this.getService(serviceName);
    return service ? service.uptime : 0;
  }

  getLastHealthCheck(serviceName: string): string | null {
    const service = this.getService(serviceName);
    return service ? service.lastCheck : null;
  }
}
