
export interface OrchestrationTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export class OrchestrationTests {
  private static testResults: OrchestrationTestResult[] = [];

  static async runAllTests(): Promise<OrchestrationTestResult[]> {
    console.log('🎭 Starting orchestration tests...');
    this.testResults = [];
    
    const tests = [
      { name: 'Request Processor', fn: () => this.testRequestProcessor() },
      { name: 'Response Coordinator', fn: () => this.testResponseCoordinator() },
      { name: 'Performance Tracker', fn: () => this.testPerformanceTracker() },
      { name: 'Streaming Manager', fn: () => this.testStreamingManager() }
    ];

    for (const test of tests) {
      await this.runSingleTest(test.name, test.fn);
    }

    console.log('✅ Orchestration tests completed');
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

  private static async testRequestProcessor(): Promise<void> {
    try {
      const module = await import('@/services/rag/orchestration/requestProcessor');
      
      if (!module || typeof module !== 'object') {
        throw new Error('Request processor module not available');
      }
    } catch (error) {
      throw new Error(`Request processor test failed: ${error}`);
    }
  }

  private static async testResponseCoordinator(): Promise<void> {
    try {
      const module = await import('@/services/rag/orchestration/responseCoordinator');
      
      if (!module || typeof module !== 'object') {
        throw new Error('Response coordinator module not available');
      }
    } catch (error) {
      throw new Error(`Response coordinator test failed: ${error}`);
    }
  }

  private static async testPerformanceTracker(): Promise<void> {
    try {
      const module = await import('@/services/rag/orchestration/performanceTracker');
      
      if (!module || typeof module !== 'object') {
        throw new Error('Performance tracker module not available');
      }
    } catch (error) {
      throw new Error(`Performance tracker test failed: ${error}`);
    }
  }

  private static async testStreamingManager(): Promise<void> {
    try {
      const module = await import('@/services/rag/orchestration/streamingManager');
      
      if (!module || typeof module !== 'object') {
        throw new Error('Streaming manager module not available');
      }
    } catch (error) {
      throw new Error(`Streaming manager test failed: ${error}`);
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
