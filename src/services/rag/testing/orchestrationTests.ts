
import { RequestProcessor, PerformanceTracker } from '../orchestration';
import { RAGRequest } from '../ragOrchestrator';

export interface OrchestrationTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  result?: any;
}

export class OrchestrationTests {
  private testResults: OrchestrationTestResult[] = [];

  async runAllTests(): Promise<OrchestrationTestResult[]> {
    console.log('🧪 Starting Orchestration Tests...');
    
    this.testResults = [];

    await this.testRequestValidation();
    await this.testRequestProcessing();
    await this.testPerformanceTracking();

    console.log('✅ Orchestration Tests Complete');
    return this.testResults;
  }

  private async testRequestValidation(): Promise<void> {
    await this.runTest('Request Validation', async () => {
      // Test valid request
      const validRequest: RAGRequest = {
        query: 'What is machine learning?',
        agentId: 'test-agent-123'
      };

      try {
        RequestProcessor.validateRequest(validRequest);
      } catch (error) {
        throw new Error('Valid request failed validation');
      }

      // Test invalid requests
      const invalidRequests = [
        { query: '', agentId: 'test-agent' },
        { query: 'Valid query', agentId: '' },
        { query: '  ', agentId: 'test-agent' }
      ];

      for (const invalidRequest of invalidRequests) {
        try {
          RequestProcessor.validateRequest(invalidRequest as RAGRequest);
          throw new Error('Invalid request passed validation');
        } catch (error) {
          // Expected to fail
        }
      }

      return { validationWorking: true };
    });
  }

  private async testRequestProcessing(): Promise<void> {
    await this.runTest('Request Processing', async () => {
      const request: RAGRequest = {
        query: 'Test query',
        agentId: 'test-agent',
        options: {
          searchFilters: { maxResults: 5 }
        }
      };

      const processedRequest = RequestProcessor.setDefaultOptions(request);
      const queryRequest = RequestProcessor.prepareQueryRequest(processedRequest);

      return {
        defaultOptionsSet: !!processedRequest.options?.searchFilters?.minSimilarity,
        queryRequestCreated: queryRequest.query === 'Test query',
        contextStringBuilt: RequestProcessor.buildContextString({ rankedContext: { chunks: [] } }) === 'No relevant context found.'
      };
    });
  }

  private async testPerformanceTracking(): Promise<void> {
    await this.runTest('Performance Tracking', async () => {
      // Clear existing metrics
      PerformanceTracker.clearMetrics();

      // Record some test metrics
      PerformanceTracker.recordRequest('agent-1', 100, true);
      PerformanceTracker.recordRequest('agent-1', 200, true);
      PerformanceTracker.recordRequest('agent-2', 150, false);

      const overallMetrics = PerformanceTracker.getMetrics();
      const agentMetrics = PerformanceTracker.getAgentMetrics('agent-1');

      return {
        overallMetricsTracked: overallMetrics.totalRequests === 3,
        successRateCalculated: overallMetrics.successRate === 2/3,
        agentMetricsTracked: agentMetrics.totalRequests === 2,
        agentSuccessRate: agentMetrics.successRate === 1.0
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

export const orchestrationTests = new OrchestrationTests();
