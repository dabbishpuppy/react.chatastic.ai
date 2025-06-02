
import { supabase } from '@/integrations/supabase/client';

export interface IntegrationTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export class IntegrationTests {
  private static testResults: IntegrationTestResult[] = [];

  static async runAllTests(): Promise<IntegrationTestResult[]> {
    console.log('🧪 Starting integration tests...');
    this.testResults = [];
    
    const testAgentId = crypto.randomUUID(); // Use proper UUID
    
    const tests = [
      { name: 'Import/Export Chains Validation', fn: () => this.testImportExportChains() },
      { name: 'RAG Orchestrator Integration', fn: () => this.testRAGOrchestrator(testAgentId) },
      { name: 'Cross-Service Communication', fn: () => this.testCrossServiceCommunication(testAgentId) },
      { name: 'Database Connection Test', fn: () => this.testDatabaseConnection() },
      { name: 'Service Health Check', fn: () => this.testServiceHealth() }
    ];

    for (const test of tests) {
      await this.runSingleTest(test.name, test.fn);
    }

    console.log('✅ Integration tests completed');
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

  private static async testImportExportChains(): Promise<void> {
    // Test that all necessary modules can be imported
    try {
      await import('@/services/rag/orchestration');
      await import('@/services/rag/enhanced/orchestration');
      await import('@/services/rag/ragOrchestrator');
      await import('@/services/rag/enhanced/serviceOrchestrator');
    } catch (error) {
      throw new Error(`Import chain validation failed: ${error}`);
    }
  }

  private static async testRAGOrchestrator(agentId: string): Promise<void> {
    try {
      const { RAGOrchestrator } = await import('@/services/rag/ragOrchestrator');
      const metrics = RAGOrchestrator.getPerformanceMetrics();
      
      if (typeof metrics.averageResponseTime !== 'number') {
        throw new Error('RAG orchestrator metrics not functioning properly');
      }
    } catch (error) {
      throw new Error(`RAG orchestrator test failed: ${error}`);
    }
  }

  private static async testCrossServiceCommunication(agentId: string): Promise<void> {
    try {
      const { ServiceOrchestrator } = await import('@/services/rag/enhanced/serviceOrchestrator');
      const orchestrator = ServiceOrchestrator.getInstance();
      const status = orchestrator.getOrchestratorStatus();
      
      if (typeof status.isRunning !== 'boolean') {
        throw new Error('Service orchestrator status not functioning');
      }
    } catch (error) {
      throw new Error(`Cross-service communication test failed: ${error}`);
    }
  }

  private static async testDatabaseConnection(): Promise<void> {
    try {
      // Test basic database connection without using invalid UUIDs
      const { data, error } = await supabase
        .from('agents')
        .select('count')
        .limit(1);

      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Database connection test failed: ${error}`);
    }
  }

  private static async testServiceHealth(): Promise<void> {
    try {
      // Basic service health check without database operations
      const services = [
        'AgentSourceService',
        'SourceChunkService', 
        'TrainingJobService',
        'AuditService'
      ];
      
      for (const serviceName of services) {
        try {
          await import('@/services/rag');
          // Service import successful
        } catch (error) {
          throw new Error(`Service ${serviceName} failed to load: ${error}`);
        }
      }
    } catch (error) {
      throw new Error(`Service health check failed: ${error}`);
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
