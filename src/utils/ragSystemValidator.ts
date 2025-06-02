
import { IntegrationTests } from '@/services/rag/testing';

export class RAGSystemValidator {
  static async validateRefactoredSystem(): Promise<{
    success: boolean;
    message: string;
    details: {
      importExports: boolean;
      functionality: boolean;
      performance: boolean;
      integration: boolean;
    };
    testResults?: any;
  }> {
    console.log('🔍 Validating refactored RAG system...');
    
    try {
      // Run comprehensive integration tests
      const testResults = await IntegrationTests.runAllTests();
      const summary = IntegrationTests.getTestSummary();
      
      const importExportsWorking = testResults.some(r => 
        r.testName === 'Import/Export Chains Validation' && r.passed
      );
      
      const functionalityWorking = testResults.some(r => 
        r.testName === 'RAG Orchestrator Integration' && r.passed
      );
      
      const performanceTracking = testResults.some(r => 
        r.testName === 'Cross-Service Communication' && r.passed
      );
      
      const integrationWorking = summary.successRate >= 80; // 80% success rate threshold
      
      const allSystemsGo = importExportsWorking && 
                          functionalityWorking && 
                          performanceTracking && 
                          integrationWorking;
      
      const details = {
        importExports: importExportsWorking,
        functionality: functionalityWorking,
        performance: performanceTracking,
        integration: integrationWorking
      };
      
      console.log('🔍 System validation results:', details);
      
      return {
        success: allSystemsGo,
        message: allSystemsGo 
          ? `✅ All systems validated successfully! (${summary.passed}/${summary.totalTests} tests passed)`
          : `⚠️ Some validation issues detected. Success rate: ${summary.successRate.toFixed(1)}%`,
        details,
        testResults: {
          summary,
          results: testResults
        }
      };
      
    } catch (error) {
      console.error('❌ System validation failed:', error);
      
      return {
        success: false,
        message: `❌ System validation failed: ${error}`,
        details: {
          importExports: false,
          functionality: false,
          performance: false,
          integration: false
        }
      };
    }
  }

  static async quickHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      // Quick import checks
      await import('@/services/rag/orchestration');
      await import('@/services/rag/enhanced/orchestration');
      await import('@/services/rag/ragOrchestrator');
      await import('@/services/rag/enhanced/serviceOrchestrator');
    } catch (error) {
      issues.push(`Import issues detected: ${error}`);
    }
    
    try {
      // Quick functionality checks
      const { RAGOrchestrator } = await import('@/services/rag/ragOrchestrator');
      const { ServiceOrchestrator } = await import('@/services/rag/enhanced/serviceOrchestrator');
      
      // Test basic functionality
      const ragMetrics = RAGOrchestrator.getPerformanceMetrics();
      const serviceOrchestrator = ServiceOrchestrator.getInstance();
      const status = serviceOrchestrator.getOrchestratorStatus();
      
      if (typeof ragMetrics.averageResponseTime !== 'number') {
        issues.push('RAG orchestrator metrics not functioning');
      }
      
      if (typeof status.isRunning !== 'boolean') {
        issues.push('Service orchestrator status not functioning');
      }
      
    } catch (error) {
      issues.push(`Functionality check failed: ${error}`);
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }
}
