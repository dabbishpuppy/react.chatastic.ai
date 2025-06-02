
import { LifecycleService } from './services/lifecycleService';
import type { ServiceStatus } from './types';

export class ServiceLifecycle {
  // Re-export LifecycleService methods for backward compatibility
  static startService = LifecycleService.startService;
  static stopService = LifecycleService.stopService;
  static restartService = LifecycleService.restartService;
  static gracefulShutdown = LifecycleService.gracefulShutdown;
}
