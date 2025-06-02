
import { 
  IntegrationTests,
  ServiceOrchestrationTests,
  OrchestrationTests,
  ragIntegrationTests 
} from '@/services/rag/testing';
import { RAGSystemValidator } from '@/utils/ragSystemValidator';

export const runComprehensiveTests = async () => {
  console.log('🧪 Starting comprehensive integration tests...');
  
  try {
    // 1. System validation first
    console.log('🔍 Step 1: System validation...');
    const systemValidation = await RAGSystemValidator.validateRefactoredSystem();
    console.log('System validation:', systemValidation);

    // 2. Integration tests
    console.log('🔗 Step 2: Integration tests...');
    const integrationResults = await IntegrationTests.runAllTests();
    const integrationSummary = IntegrationTests.getTestSummary();
    const integrationSuccessRate = integrationSummary.totalTests > 0 ? (integrationSummary.passed / integrationSummary.totalTests) * 100 : 0;
    console.log('Integration tests:', { results: integrationResults, summary: integrationSummary });

    // 3. Service orchestration tests
    console.log('⚙️ Step 3: Service orchestration tests...');
    const serviceResults = await ServiceOrchestrationTests.runAllTests();
    const serviceSummary = ServiceOrchestrationTests.getTestSummary();
    const serviceSuccessRate = serviceSummary.totalTests > 0 ? (serviceSummary.passed / serviceSummary.totalTests) * 100 : 0;
    console.log('Service orchestration tests:', { results: serviceResults, summary: serviceSummary });

    // 4. Core orchestration tests
    console.log('🎭 Step 4: Core orchestration tests...');
    const orchestrationResults = await OrchestrationTests.runAllTests();
    const orchestrationSummary = OrchestrationTests.getTestSummary();
    const orchestrationSuccessRate = orchestrationSummary.totalTests > 0 ? (orchestrationSummary.passed / orchestrationSummary.totalTests) * 100 : 0;
    console.log('Core orchestration tests:', { results: orchestrationResults, summary: orchestrationSummary });

    // 5. RAG integration tests
    console.log('🤖 Step 5: RAG integration tests...');
    const ragResults = await ragIntegrationTests.runAllTests();
    console.log('RAG integration tests:', ragResults);

    // Compile overall results
    const totalTests = integrationSummary.totalTests + 
                      serviceSummary.totalTests + 
                      orchestrationSummary.totalTests + 
                      ragResults.summary.totalTests;
    
    const totalPassed = integrationSummary.passed + 
                       serviceSummary.passed + 
                       orchestrationSummary.passed + 
                       ragResults.summary.passed;

    const overallSuccess = systemValidation.success && 
                          integrationSuccessRate >= 80 &&
                          serviceSuccessRate >= 80 &&
                          orchestrationSuccessRate >= 80;

    console.log('🎯 FINAL RESULTS:', {
      systemValidation: systemValidation.success,
      totalTests,
      totalPassed,
      successRate: (totalPassed / totalTests) * 100,
      overallSuccess,
      details: {
        integration: integrationSummary,
        service: serviceSummary,
        orchestration: orchestrationSummary,
        rag: ragResults.summary
      }
    });

    return {
      success: overallSuccess,
      totalTests,
      totalPassed,
      systemValidation,
      details: {
        integration: { results: integrationResults, summary: integrationSummary },
        service: { results: serviceResults, summary: serviceSummary },
        orchestration: { results: orchestrationResults, summary: orchestrationSummary },
        rag: ragResults
      }
    };

  } catch (error) {
    console.error('❌ Comprehensive test execution failed:', error);
    throw error;
  }
};

// Auto-run tests if this file is imported
if (typeof window !== 'undefined') {
  // Only run in browser environment
  console.log('🚀 Auto-executing comprehensive integration tests...');
  runComprehensiveTests().then(results => {
    console.log('✅ Comprehensive tests completed:', results);
  }).catch(error => {
    console.error('❌ Comprehensive tests failed:', error);
  });
}
