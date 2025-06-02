
import { HealthService } from './services/healthService';
import type { ServiceStatus } from './types';

export class HealthMonitor {
  // Re-export HealthService methods for backward compatibility
  static performHealthCheck = HealthService.performHealthCheck;
  static calculateServiceHealth = HealthService.calculateServiceHealth;
  static startHealthMonitoring = HealthService.startHealthMonitoring;
  static performServiceDiagnostics = HealthService.performServiceDiagnostics;
}
