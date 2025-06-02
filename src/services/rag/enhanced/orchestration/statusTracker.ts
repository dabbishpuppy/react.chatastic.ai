
import { ServiceStatus } from './types';

export class StatusTracker {
  private services = new Map<string, ServiceStatus>();

  updateServiceStatus(serviceName: string, status: ServiceStatus['status']): void {
    const existing = this.services.get(serviceName);
    const now = new Date().toISOString();
    
    this.services.set(serviceName, {
      name: serviceName,
      status,
      uptime: existing ? existing.uptime : 0,
      lastCheck: now,
      health: status === 'running' ? 100 : status === 'error' ? 0 : 50
    });
  }

  updateService(serviceName: string, updatedService: ServiceStatus): void {
    this.services.set(serviceName, updatedService);
  }

  getServiceStatus(serviceName: string): ServiceStatus | null {
    return this.services.get(serviceName) || null;
  }

  getAllServices(): ServiceStatus[] {
    return Array.from(this.services.values());
  }

  getRunningServicesCount(): number {
    return this.getAllServices().filter(s => s.status === 'running').length;
  }

  getOverallHealth(): number {
    const services = this.getAllServices();
    return services.length > 0 
      ? Math.round(services.reduce((sum, s) => sum + s.health, 0) / services.length)
      : 0;
  }

  clearServices(): void {
    this.services.clear();
  }

  getServicesMap(): Map<string, ServiceStatus> {
    return new Map(this.services);
  }
}
