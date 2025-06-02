
import { OrchestrationConfig, ServiceStatus } from './types';

export class ServiceLifecycle {
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
}
