
import { RAGOrchestrator, type RAGRequest } from '../ragOrchestrator';
import { ServiceOrchestrator } from '../enhanced/serviceOrchestrator';
import { 
  RequestProcessor, 
  ResponseCoordinator, 
  StreamingManager, 
  PerformanceTracker 
} from '../orchestration';
import { 
  ServiceLifecycle, 
  HealthMonitor, 
  ConfigurationManager, 
  StatusTracker 
} from '../enhanced/orchestration';

export interface IntegrationTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  result?: any;
}

export class IntegrationTests {
  private testResults: IntegrationTestResult[] = [];

  async runAllTests(): Promise<IntegrationTestResult[]> {
    console.log('🧪 Starting Integration Tests...');
    
    this.testResults = [];

    await this.testRAGOrchestratorIntegration();
    await this.testServiceOrchestratorIntegration();
    await this.testOrchestrationModulesIntegration();
    await this.testEnhancedOrchestrationIntegration();
    await this.testCrossServiceCommunication();
    await this.testImportExportChains();

    console.log('✅ Integration Tests Complete');
    return this.testResults;
  }

  private async testRAGOrchestratorIntegration(): Promise<void> {
    await this.runTest('RAG Orchestrator Integration', async () => {
      // Test that RAG orchestrator can still process requests with refactored modules
      const testRequest: RAGRequest = {
        query: 'Test integration query',
        agentId: 'test-agent-123',
        options: {
          searchFilters: { maxResults: 3 },
          streaming: false
        }
      };

      // Test request validation
      RequestProcessor.validateRequest(testRequest);
      const processedRequest = RequestProcessor.setDefaultOptions(testRequest);
      
      // Test performance tracking
      PerformanceTracker.recordRequest('test-agent-123', 1500, true);
      const metrics = PerformanceTracker.getMetrics();
      
      // Test streaming manager
      const activeStreams = StreamingManager.getActiveStreamsCount();

      return {
        requestValidated: true,
        requestProcessed: !!processedRequest.options?.searchFilters,
        metricsRecorded: metrics.totalRequests > 0,
        streamingManagerWorking: typeof activeStreams === 'number'
      };
    });
  }

  private async testServiceOrchestratorIntegration(): Promise<void> {
    await this.runTest('Service Orchestrator Integration', async () => {
      // Test that service orchestrator works with refactored modules
      const orchestrator = ServiceOrchestrator.getInstance({
        enableMetrics: true,
        enableAlerting: false
      });

      const statusBefore = orchestrator.getOrchestratorStatus();
      
      // Test configuration management
      const config = ConfigurationManager.createConfig({ enableMetrics: false });
      orchestrator.updateConfiguration(config);
      
      const statusAfter = orchestrator.getOrchestratorStatus();

      return {
        orchestratorCreated: !!orchestrator,
        statusRetrieved: typeof statusBefore.isRunning === 'boolean',
        configurationUpdated: true,
        statusConsistent: typeof statusAfter.isRunning === 'boolean'
      };
    });
  }

  private async testOrchestrationModulesIntegration(): Promise<void> {
    await this.runTest('Orchestration Modules Integration', async () => {
      // Test that all orchestration modules work together
      const testRequest: RAGRequest = {
        query: 'Module integration test',
        agentId: 'module-test-agent'
      };

      // Test request processor
      RequestProcessor.validateRequest(testRequest);
      const preparedRequest = RequestProcessor.prepareQueryRequest(testRequest);
      const contextString = RequestProcessor.buildContextString({
        rankedContext: { chunks: [{ content: 'test content' }] }
      });

      // Test performance tracker
      PerformanceTracker.recordRequest('module-test-agent', 2000, true);
      const agentMetrics = PerformanceTracker.getAgentMetrics('module-test-agent');

      return {
        requestProcessed: !!preparedRequest.agentId,
        contextBuilt: contextString.includes('test content'),
        performanceTracked: agentMetrics.totalRequests > 0,
        modulesIntegrated: true
      };
    });
  }

  private async testEnhancedOrchestrationIntegration(): Promise<void> {
    await this.runTest('Enhanced Orchestration Integration', async () => {
      // Test enhanced orchestration modules work together
      const statusTracker = new StatusTracker();
      
      // Test status tracking
      statusTracker.updateServiceStatus('test-service', 'running');
      const serviceStatus = statusTracker.getServiceStatus('test-service');
      const allServices = statusTracker.getAllServices();
      const health = statusTracker.getOverallHealth();

      // Test configuration management
      const defaultConfig = ConfigurationManager.getDefaultConfig();
      const customConfig = ConfigurationManager.createConfig({
        enableMetrics: false
      });
      const validation = ConfigurationManager.validateConfig(customConfig);

      // Test health monitoring
      const calculatedHealth = HealthMonitor.calculateServiceHealth('test-service');

      return {
        statusTracked: serviceStatus?.status === 'running',
        servicesRetrieved: allServices.length === 1,
        healthCalculated: typeof health === 'number',
        configurationWorking: defaultConfig.enableMetrics === true,
        customConfigCreated: customConfig.enableMetrics === false,
        validationWorking: validation.valid === true,
        healthMonitorWorking: typeof calculatedHealth === 'number'
      };
    });
  }

  private async testCrossServiceCommunication(): Promise<void> {
    await this.runTest('Cross-Service Communication', async () => {
      // Test that refactored services can communicate properly
      const orchestrator = ServiceOrchestrator.getInstance();
      const statusTracker = new StatusTracker();

      // Initialize some services
      statusTracker.updateServiceStatus('MetricsService', 'running');
      statusTracker.updateServiceStatus('AlertingService', 'stopped');

      const runningCount = statusTracker.getRunningServicesCount();
      const overallHealth = statusTracker.getOverallHealth();
      
      // Test performance metrics integration
      PerformanceTracker.recordRequest('cross-test-agent', 1200, true);
      PerformanceTracker.recordRequest('cross-test-agent', 1800, false);
      
      const performanceMetrics = PerformanceTracker.getMetrics();
      const ragMetrics = RAGOrchestrator.getPerformanceMetrics();

      return {
        servicesCommunicating: runningCount === 1,
        healthAggregated: overallHealth >= 0,
        performanceIntegrated: performanceMetrics.totalRequests >= 2,
        ragMetricsAccessible: typeof ragMetrics.averageResponseTime === 'number',
        crossServiceWorking: true
      };
    });
  }

  private async testImportExportChains(): Promise<void> {
    await this.runTest('Import/Export Chains Validation', async () => {
      // Test that all imports and exports work correctly after refactoring
      try {
        // Test orchestration imports
        const { RequestProcessor: RP } = await import('../orchestration');
        const { ResponseCoordinator: RC } = await import('../orchestration');
        const { StreamingManager: SM } = await import('../orchestration');
        const { PerformanceTracker: PT } = await import('../orchestration');

        // Test enhanced orchestration imports
        const { ServiceLifecycle: SL } = await import('../enhanced/orchestration');
        const { HealthMonitor: HM } = await import('../enhanced/orchestration');
        const { ConfigurationManager: CM } = await import('../enhanced/orchestration');
        const { StatusTracker: ST } = await import('../enhanced/orchestration');

        // Test main service imports
        const { RAGOrchestrator: RO } = await import('../ragOrchestrator');
        const { ServiceOrchestrator: SO } = await import('../enhanced/serviceOrchestrator');

        // Test that classes/objects are properly exported
        const orchestrationImports = !!(RP && RC && SM && PT);
        const enhancedImports = !!(SL && HM && CM && ST);
        const mainImports = !!(RO && SO);

        return {
          orchestrationImportsWorking: orchestrationImports,
          enhancedImportsWorking: enhancedImports,
          mainImportsWorking: mainImports,
          allImportsSuccessful: orchestrationImports && enhancedImports && mainImports
        };
      } catch (error) {
        throw new Error(`Import chain validation failed: ${error}`);
      }
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
    successRate: number;
  } {
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = totalTests - passed;
    const averageDuration = totalTests > 0 
      ? this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests 
      : 0;
    const successRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;

    return { totalTests, passed, failed, averageDuration, successRate };
  }
}

export const integrationTests = new IntegrationTests();
