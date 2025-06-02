
import { useState, useCallback } from 'react';
import { useBasicRAGTesting } from './useBasicRAGTesting';
import { useAdvancedRAGTesting } from './useAdvancedRAGTesting';

export const useRAGTesting = () => {
  const [summary, setSummary] = useState<{
    totalTests: number;
    passed: number;
    failed: number;
    averageDuration: number;
  } | null>(null);

  const basicTesting = useBasicRAGTesting();
  const advancedTesting = useAdvancedRAGTesting();

  // Run all tests (updated to include enhanced query engine tests)
  const runAllTests = useCallback(async () => {
    const isRunning = basicTesting.isRunning || advancedTesting.isRunning;
    if (isRunning) return;

    try {
      const [
        integrationResults, 
        advancedResults, 
        orchestrationResults, 
        serviceOrchestrationResults,
        fullIntegrationResults,
        enhancedQueryEngineResults
      ] = await Promise.all([
        basicTesting.runTests(),
        advancedTesting.runAdvancedTests(),
        advancedTesting.runOrchestrationTests(),
        advancedTesting.runServiceOrchestrationTests(),
        advancedTesting.runIntegrationTests(),
        advancedTesting.runEnhancedQueryEngineTests()
      ]);

      // Combine summaries
      const combinedSummary = {
        totalTests: integrationResults.summary.totalTests + 
                   advancedResults.length + 
                   orchestrationResults.length + 
                   serviceOrchestrationResults.length +
                   fullIntegrationResults.length +
                   enhancedQueryEngineResults.length,
        passed: integrationResults.summary.passed + 
               advancedResults.filter(r => r.passed).length + 
               orchestrationResults.filter(r => r.passed).length + 
               serviceOrchestrationResults.filter(r => r.passed).length +
               fullIntegrationResults.filter(r => r.passed).length +
               enhancedQueryEngineResults.filter(r => r.passed).length,
        failed: integrationResults.summary.failed + 
               advancedResults.filter(r => !r.passed).length + 
               orchestrationResults.filter(r => !r.passed).length + 
               serviceOrchestrationResults.filter(r => !r.passed).length +
               fullIntegrationResults.filter(r => !r.passed).length +
               enhancedQueryEngineResults.filter(r => !r.passed).length,
        averageDuration: [
          integrationResults.summary.averageDuration,
          advancedResults.reduce((sum, r) => sum + r.duration, 0) / (advancedResults.length || 1),
          orchestrationResults.reduce((sum, r) => sum + r.duration, 0) / (orchestrationResults.length || 1),
          serviceOrchestrationResults.reduce((sum, r) => sum + r.duration, 0) / (serviceOrchestrationResults.length || 1),
          fullIntegrationResults.reduce((sum, r) => sum + r.duration, 0) / (fullIntegrationResults.length || 1),
          enhancedQueryEngineResults.reduce((sum, r) => sum + r.duration, 0) / (enhancedQueryEngineResults.length || 1)
        ].reduce((sum, avg) => sum + avg, 0) / 6
      };
      
      setSummary(combinedSummary);

      return {
        integration: integrationResults,
        advanced: advancedResults,
        orchestration: orchestrationResults,
        serviceOrchestration: serviceOrchestrationResults,
        fullIntegration: fullIntegrationResults,
        enhancedQueryEngine: enhancedQueryEngineResults,
        summary: combinedSummary
      };
    } catch (error) {
      console.error('Failed to run all RAG tests:', error);
      throw error;
    }
  }, [basicTesting, advancedTesting]);

  // Clear all results
  const clearResults = useCallback(() => {
    basicTesting.clearResults();
    advancedTesting.clearResults();
    setSummary(null);
  }, [basicTesting, advancedTesting]);

  return {
    // State
    isRunning: basicTesting.isRunning || advancedTesting.isRunning,
    testResults: basicTesting.testResults,
    advancedTestResults: advancedTesting.advancedTestResults,
    orchestrationTestResults: advancedTesting.orchestrationTestResults,
    serviceOrchestrationTestResults: advancedTesting.serviceOrchestrationTestResults,
    integrationTestResults: advancedTesting.integrationTestResults,
    enhancedQueryEngineTestResults: advancedTesting.enhancedQueryEngineTestResults,
    benchmarks: basicTesting.benchmarks,
    summary,

    // Actions
    runTests: basicTesting.runTests,
    runAdvancedTests: advancedTesting.runAdvancedTests,
    runOrchestrationTests: advancedTesting.runOrchestrationTests,
    runServiceOrchestrationTests: advancedTesting.runServiceOrchestrationTests,
    runIntegrationTests: advancedTesting.runIntegrationTests,
    runEnhancedQueryEngineTests: advancedTesting.runEnhancedQueryEngineTests,
    runAllTests,
    getDetailedReport: basicTesting.getDetailedReport,
    clearResults
  };
};

export default useRAGTesting;
