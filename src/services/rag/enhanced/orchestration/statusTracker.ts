
import type { ServiceStatus } from './types';

export class StatusTracker {
  private services = new Map<string, ServiceStatus>();
  private persistenceKey = 'wonderwave_service_status';

  constructor() {
    this.loadPersistedServices();
  }

  private loadPersistedServices(): void {
    try {
      const savedServices = localStorage.getItem(this.persistenceKey);
      if (savedServices) {
        const servicesArray = JSON.parse(savedServices);
        servicesArray.forEach((service: ServiceStatus) => {
          this.services.set(service.name, service);
        });
        console.log(`📋 Loaded ${servicesArray.length} persisted service statuses`);
      }
    } catch (error) {
      console.error('Failed to load persisted services:', error);
    }
  }

  private persistServices(): void {
    try {
      const servicesArray = Array.from(this.services.values());
      localStorage.setItem(this.persistenceKey, JSON.stringify(servicesArray));
    } catch (error) {
      console.error('Failed to persist services:', error);
    }
  }

  updateServiceStatus(name: string, status: ServiceStatus['status']): void {
    const existingService = this.services.get(name);
    const updatedService: ServiceStatus = {
      name,
      status,
      health: status === 'running' ? 100 : status === 'error' ? 0 : 50,
      lastSeen: new Date(),
      uptime: existingService?.uptime || 0,
      errorCount: status === 'error' ? (existingService?.errorCount || 0) + 1 : (existingService?.errorCount || 0)
    };

    this.services.set(name, updatedService);
    this.persistServices();
  }

  updateService(name: string, service: ServiceStatus): void {
    this.services.set(name, service);
    this.persistServices();
  }

  getServiceStatus(name: string): ServiceStatus | null {
    return this.services.get(name) || null;
  }

  getAllServices(): ServiceStatus[] {
    return Array.from(this.services.values());
  }

  getServicesMap(): Map<string, ServiceStatus> {
    return new Map(this.services);
  }

  getOverallHealth(): number {
    const services = Array.from(this.services.values());
    if (services.length === 0) return 0;

    const totalHealth = services.reduce((sum, service) => sum + service.health, 0);
    return Math.round(totalHealth / services.length);
  }

  clearServices(): void {
    this.services.clear();
    localStorage.removeItem(this.persistenceKey);
  }
}
