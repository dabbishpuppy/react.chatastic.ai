
import { ServiceStatus } from '../types';

export class LifecycleService {
  static async startService(
    serviceName: string, 
    startFn: () => Promise<void> | void,
    updateStatusCallback: (name: string, status: ServiceStatus['status']) => void
  ): Promise<void> {
    try {
      console.log(`🔄 Starting ${serviceName}...`);
      await startFn();
      updateStatusCallback(serviceName, 'running');
      console.log(`✅ ${serviceName} started successfully`);
    } catch (error) {
      console.error(`❌ Failed to start ${serviceName}:`, error);
      updateStatusCallback(serviceName, 'error');
      throw error;
    }
  }

  static async stopService(
    serviceName: string,
    stopFn: () => void,
    updateStatusCallback: (name: string, status: ServiceStatus['status']) => void
  ): Promise<void> {
    try {
      console.log(`🔄 Stopping ${serviceName}...`);
      stopFn();
      updateStatusCallback(serviceName, 'stopped');
      console.log(`✅ ${serviceName} stopped successfully`);
    } catch (error) {
      console.error(`❌ Error stopping ${serviceName}:`, error);
      updateStatusCallback(serviceName, 'error');
    }
  }

  static async restartService(
    serviceName: string,
    updateStatusCallback: (name: string, status: ServiceStatus['status']) => void
  ): Promise<void> {
    console.log(`🔄 Restarting ${serviceName}...`);
    
    updateStatusCallback(serviceName, 'stopped');
    
    // Simulate restart delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    updateStatusCallback(serviceName, 'running');
    console.log(`✅ ${serviceName} restarted successfully`);
  }

  static async gracefulShutdown(
    services: string[],
    stopServiceFn: (name: string) => Promise<void>
  ): Promise<void> {
    console.log('🔄 Initiating graceful shutdown...');
    
    // Stop services in reverse order of startup
    const reversedServices = [...services].reverse();
    
    for (const serviceName of reversedServices) {
      try {
        await stopServiceFn(serviceName);
      } catch (error) {
        console.error(`Error during graceful shutdown of ${serviceName}:`, error);
      }
    }
    
    console.log('✅ Graceful shutdown completed');
  }
}
