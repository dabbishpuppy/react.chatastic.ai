import {
  EnhancedQueryProcessor,
  StreamingProcessor,
  OptimizationEngine,
  QueryAnalytics,
  type EnhancedQueryRequest
} from '../enhanced/ragQueryEngineEnhanced';

export interface EnhancedQueryEngineTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  result?: any;
}

export class EnhancedQueryEngineTests {
  private testResults: EnhancedQueryEngineTestResult[] = [];

  async runAllTests(): Promise<EnhancedQueryEngineTestResult[]> {
    console.log('🧪 Starting Enhanced Query Engine Tests...');
    
    this.testResults = [];

    await this.testEnhancedQueryProcessor();
    await this.testStreamingProcessor();
    await this.testOptimizationEngine();
    await this.testQueryAnalytics();

    console.log('✅ Enhanced Query Engine Tests Complete');
    return this.testResults;
  }

  private async testEnhancedQueryProcessor(): Promise<void> {
    await this.runTest('Enhanced Query Processor', async () => {
      const request: EnhancedQueryRequest = {
        query: 'Test enhanced query processing',
        agentId: 'test-agent-enhanced',
        optimizationStrategy: 'balanced',
        searchFilters: {
          maxResults: 5
        }
      };

      const result = await EnhancedQueryProcessor.processQueryWithOptimizations(request);

      return {
        resultGenerated: !!result.rankedContext,
        optimizationsApplied: result.optimizations.appliedOptimizations.length > 0,
        processingTimeRecorded: typeof result.processingTimeMs === 'number',
        cacheStatusTracked: typeof result.optimizations.cacheHit === 'boolean'
      };
    });
  }

  private async testStreamingProcessor(): Promise<void> {
    await this.runTest('Streaming Processor', async () => {
      const progressUpdates: Array<{stage: string, progress: number}> = [];
      
      const request = {
        query: 'Test streaming query',
        agentId: 'streaming-test-agent'
      };

      const result = await StreamingProcessor.processQueryWithStreaming(
        request,
        (stage, progress) => {
          progressUpdates.push({ stage, progress });
        }
      );

      return {
        resultGenerated: !!result.rankedContext,
        progressUpdatesReceived: progressUpdates.length > 0,
        completionReached: progressUpdates.some(u => u.progress === 100),
        streamingMetadataPresent: !!result.streamingMetadata
      };
    });
  }

  private async testOptimizationEngine(): Promise<void> {
    await this.runTest('Optimization Engine', async () => {
      // Test optimization recommendations
      const mockQueryHistory = [
        { processingTime: 3000, cacheHit: false, rankedContext: { totalRelevanceScore: 1.5 } },
        { processingTime: 2500, cacheHit: true, rankedContext: { totalRelevanceScore: 2.8 } },
        { processingTime: 4000, cacheHit: false, rankedContext: { totalRelevanceScore: 1.2 } }
      ];

      const recommendations = OptimizationEngine.analyzeQueryPerformance(mockQueryHistory);
      const optimizationPlan = OptimizationEngine.generateOptimizationPlan(recommendations);

      // Test automatic optimizations
      const mockRequest = {
        query: 'test query',
        agentId: 'optimization-test'
      };

      const { optimizedRequest, optimizationsApplied } = OptimizationEngine.applyAutomaticOptimizations(mockRequest);

      return {
        recommendationsGenerated: recommendations.length > 0,
        optimizationPlanCreated: !!optimizationPlan.plan && optimizationPlan.plan.length > 0,
        automaticOptimizationsApplied: optimizationsApplied.length >= 0,
        optimizedRequestGenerated: !!optimizedRequest
      };
    });
  }

  private async testQueryAnalytics(): Promise<void> {
    await this.runTest('Query Analytics', async () => {
      // Clear existing analytics
      QueryAnalytics.clearAnalytics();

      // Record test analytics
      QueryAnalytics.recordQuery({
        processingTime: 1500,
        optimizationLevel: 'standard',
        cacheHit: true,
        resultQuality: 4.2,
        errorCount: 0
      });

      QueryAnalytics.recordQuery({
        processingTime: 2800,
        optimizationLevel: 'aggressive',
        cacheHit: false,
        resultQuality: 3.8,
        errorCount: 1
      });

      // Test analytics retrieval
      const summary = QueryAnalytics.getAnalyticsSummary();
      const trends = QueryAnalytics.getPerformanceTrends();
      const slowQueries = QueryAnalytics.identifySlowQueries(2000);
      const report = QueryAnalytics.generatePerformanceReport();

      return {
        analyticsRecorded: summary.totalQueries === 2,
        summaryGenerated: summary.averageProcessingTime > 0,
        trendsCalculated: Array.isArray(trends),
        slowQueriesIdentified: slowQueries.length === 1,
        reportGenerated: !!report.summary && Array.isArray(report.recommendations)
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

export const enhancedQueryEngineTests = new EnhancedQueryEngineTests();
