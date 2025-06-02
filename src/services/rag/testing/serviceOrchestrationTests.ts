
export interface ServiceOrchestrationTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export class ServiceOrchestrationTests {
  private static testResults: ServiceOrchestrationTestResult[] = [];

  static async runAllTests(): Promise<ServiceOrchestrationTestResult[]> {
    console.log('⚙️ Starting service orchestration tests...');
    this.testResults = [];
    
    const tests = [
      { name: 'Service Orchestrator Initialization', fn: () => this.testServiceOrchestratorInit() },
      { name: 'Service Lifecycle Management', fn: () => this.testServiceLifecycle() },
      { name: 'Configuration Management', fn: () => this.testConfigurationManagement() },
      { name: 'Health Monitoring', fn: () => this.testHealthMonitoring() },
      { name: 'Status Tracking', fn: () => this.testStatusTracking() }
    ];

    for (const test of tests) {
      await this.runSingleTest(test.name, test.fn);
    }

    console.log('✅ Service orchestration tests completed');
    return this.testResults;
  }

  private static async runSingleTest(testName: string, testFn: () => Promise<void>) {
    const startTime = performance.now();
    
    try {
      await testFn();
      const duration = performance.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: true,
        duration
      });
      
      console.log(`✅ ${testName} passed (${duration.toFixed(2)}ms)`);
    } catch (error: any) {
      const duration = performance.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        duration,
        error: error.message || 'Unknown error'
      });
      
      console.error(`❌ ${testName} failed:`, error.message);
    }
  }

  private static async testServiceOrchestratorInit(): Promise<void> {
    try {
      const { ServiceOrchestrator } = await import('@/services/rag/enhanced/serviceOrchestrator');
      const orchestrator = ServiceOrchestrator.getInstance();
      
      if (!orchestrator) {
        throw new Error('Service orchestrator failed to initialize');
      }
    } catch (error) {
      throw new Error(`Service orchestrator initialization failed: ${error}`);
    }
  }

  private static async testServiceLifecycle(): Promise<void> {
    try {
      const { serviceLifecycle } = await import('@/services/rag/enhanced/orchestration/serviceLifecycle');
      
      if (typeof serviceLifecycle !== 'object') {
        throw new Error('Service lifecycle manager not available');
      }
    } catch (error) {
      throw new Error(`Service lifecycle test failed: ${error}`);
    }
  }

  private static async testConfigurationManagement(): Promise<void> {
    try {
      const { configurationManager } = await import('@/services/rag/enhanced/orchestration/configurationManager');
      
      if (typeof configurationManager !== 'object') {
        throw new Error('Configuration manager not available');
      }
    } catch (error) {
      throw new Error(`Configuration management test failed: ${error}`);
    }
  }

  private static async testHealthMonitoring(): Promise<void> {
    try {
      const { healthMonitor } = await import('@/services/rag/enhanced/orchestration/healthMonitor');
      
      if (typeof healthMonitor !== 'object') {
        throw new Error('Health monitor not available');
      }
    } catch (error) {
      throw new Error(`Health monitoring test failed: ${error}`);
    }
  }

  private static async testStatusTracking(): Promise<void> {
    try {
      const { statusTracker } = await import('@/services/rag/enhanced/orchestration/statusTracker');
      
      if (typeof statusTracker !== 'object') {
        throw new Error('Status tracker not available');
      }
    } catch (error) {
      throw new Error(`Status tracking test failed: ${error}`);
    }
  }

  static getTestSummary() {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = totalTests - passed;
    const averageDuration = totalTests > 0 
      ? this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests 
      : 0;
    const successRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;

    return {
      totalTests,
      passed,
      failed,
      averageDuration,
      successRate
    };
  }
}

export const serviceOrchestrationTests = new ServiceOrchestrationTests();
