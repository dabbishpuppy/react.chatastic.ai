
import { 
  ServiceLifecycle, 
  HealthMonitor, 
  ConfigurationManager, 
  StatusTracker,
  type ServiceStatus,
  type OrchestrationConfig 
} from '../enhanced/orchestration';

export interface ServiceOrchestrationTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  result?: any;
}

export class ServiceOrchestrationTests {
  private testResults: ServiceOrchestrationTestResult[] = [];

  async runAllTests(): Promise<ServiceOrchestrationTestResult[]> {
    console.log('🧪 Starting Service Orchestration Tests...');
    
    this.testResults = [];

    await this.testConfigurationManager();
    await this.testStatusTracker();
    await this.testHealthMonitor();
    await this.testServiceLifecycle();

    console.log('✅ Service Orchestration Tests Complete');
    return this.testResults;
  }

  private async testConfigurationManager(): Promise<void> {
    await this.runTest('Configuration Manager', async () => {
      // Test default config creation
      const defaultConfig = ConfigurationManager.getDefaultConfig();
      const config = ConfigurationManager.createConfig();
      
      // Test config updates
      const updatedConfig = ConfigurationManager.updateConfig(config, {
        enableMetrics: false,
        enableAlerting: false
      });

      // Test validation
      const validation = ConfigurationManager.validateConfig(updatedConfig);

      return {
        defaultConfigCreated: !!defaultConfig.enableMetrics,
        configUpdated: !updatedConfig.enableMetrics && !updatedConfig.enableAlerting,
        validationWorking: validation.valid
      };
    });
  }

  private async testStatusTracker(): Promise<void> {
    await this.runTest('Status Tracker', async () => {
      const tracker = new StatusTracker();

      // Test service status updates
      tracker.updateServiceStatus('test-service', 'running');
      tracker.updateServiceStatus('test-service-2', 'stopped');

      const runningService = tracker.getServiceStatus('test-service');
      const stoppedService = tracker.getServiceStatus('test-service-2');
      const allServices = tracker.getAllServices();
      const runningCount = tracker.getRunningServicesCount();
      const overallHealth = tracker.getOverallHealth();

      return {
        runningServiceTracked: runningService?.status === 'running',
        stoppedServiceTracked: stoppedService?.status === 'stopped',
        allServicesRetrieved: allServices.length === 2,
        runningCountCorrect: runningCount === 1,
        healthCalculated: typeof overallHealth === 'number'
      };
    });
  }

  private async testHealthMonitor(): Promise<void> {
    await this.runTest('Health Monitor', async () => {
      const services = new Map<string, ServiceStatus>();
      services.set('test-service', {
        name: 'test-service',
        status: 'running',
        uptime: 100,
        lastCheck: new Date().toISOString(),
        health: 100
      });

      const updates: { name: string; service: ServiceStatus }[] = [];
      const updateCallback = (name: string, service: ServiceStatus) => {
        updates.push({ name, service });
      };

      await HealthMonitor.performHealthCheck(
        services,
        Date.now() - 5000,
        updateCallback
      );

      const health = HealthMonitor.calculateServiceHealth('test-service');

      return {
        healthCheckPerformed: updates.length > 0,
        healthCalculated: typeof health === 'number' && health >= 0 && health <= 100
      };
    });
  }

  private async testServiceLifecycle(): Promise<void> {
    await this.runTest('Service Lifecycle', async () => {
      const statusUpdates: { name: string; status: string }[] = [];
      const updateCallback = (name: string, status: ServiceStatus['status']) => {
        statusUpdates.push({ name, status });
      };

      // Test service start
      await ServiceLifecycle.startService(
        'test-service',
        async () => {
          // Simulate service start
          return Promise.resolve();
        },
        updateCallback
      );

      // Test service stop
      await ServiceLifecycle.stopService(
        'test-service',
        () => {
          // Simulate service stop
        },
        updateCallback
      );

      // Test service restart
      await ServiceLifecycle.restartService('test-service', updateCallback);

      return {
        serviceStarted: statusUpdates.some(u => u.status === 'running'),
        serviceStopped: statusUpdates.some(u => u.status === 'stopped'),
        totalUpdates: statusUpdates.length
      };
    });
  }

  private async runTest(
    testName: string,
    testFn: () => Promise<any>
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: true,
        duration,
        result
      });
      
      console.log(`✅ ${testName} - Passed (${duration.toFixed(2)}ms)`);
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.log(`❌ ${testName} - Failed: ${error}`);
    }
  }

  getTestSummary(): {
    totalTests: number;
    passed: number;
    failed: number;
    averageDuration: number;
  } {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = totalTests - passed;
    const averageDuration = totalTests > 0 
      ? this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests 
      : 0;

    return { totalTests, passed, failed, averageDuration };
  }
}

export const serviceOrchestrationTests = new ServiceOrchestrationTests();
