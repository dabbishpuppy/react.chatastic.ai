import { useState, useCallback } from 'react';
import { 
  ragIntegrationTests, 
  advancedRAGTests,
  orchestrationTests,
  serviceOrchestrationTests,
  integrationTests,
  type TestResult, 
  type PerformanceBenchmark,
  type AdvancedRAGTestResult,
  type OrchestrationTestResult,
  type ServiceOrchestrationTestResult,
  type IntegrationTestResult
} from '@/services/rag/testing';

export const useRAGTesting = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [advancedTestResults, setAdvancedTestResults] = useState<AdvancedRAGTestResult[]>([]);
  const [orchestrationTestResults, setOrchestrationTestResults] = useState<OrchestrationTestResult[]>([]);
  const [serviceOrchestrationTestResults, setServiceOrchestrationTestResults] = useState<ServiceOrchestrationTestResult[]>([]);
  const [integrationTestResults, setIntegrationTestResults] = useState<IntegrationTestResult[]>([]);
  const [benchmarks, setBenchmarks] = useState<PerformanceBenchmark[]>([]);
  const [summary, setSummary] = useState<{
    totalTests: number;
    passed: number;
    failed: number;
    averageDuration: number;
  } | null>(null);

  // Run all integration tests
  const runTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await ragIntegrationTests.runAllTests();
      setTestResults(results.results);
      setBenchmarks(results.benchmarks);
      setSummary(results.summary);
      return results;
    } catch (error) {
      console.error('Failed to run RAG tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Run advanced RAG tests
  const runAdvancedTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await advancedRAGTests.runAllTests();
      setAdvancedTestResults(results);
      
      const summary = advancedRAGTests.getTestSummary();
      setSummary(summary);
      
      return results;
    } catch (error) {
      console.error('Failed to run advanced RAG tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Run orchestration tests
  const runOrchestrationTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await orchestrationTests.runAllTests();
      setOrchestrationTestResults(results);
      
      const summary = orchestrationTests.getTestSummary();
      setSummary(summary);
      
      return results;
    } catch (error) {
      console.error('Failed to run orchestration tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Run service orchestration tests
  const runServiceOrchestrationTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await serviceOrchestrationTests.runAllTests();
      setServiceOrchestrationTestResults(results);
      
      const summary = serviceOrchestrationTests.getTestSummary();
      setSummary(summary);
      
      return results;
    } catch (error) {
      console.error('Failed to run service orchestration tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Run integration tests
  const runIntegrationTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await integrationTests.runAllTests();
      setIntegrationTestResults(results);
      
      const summary = integrationTests.getTestSummary();
      setSummary(summary);
      
      return results;
    } catch (error) {
      console.error('Failed to run integration tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Run all tests (integration + advanced + orchestration + service orchestration + integration)
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const [
        integrationResults, 
        advancedResults, 
        orchestrationResults, 
        serviceOrchestrationResults,
        fullIntegrationResults
      ] = await Promise.all([
        ragIntegrationTests.runAllTests(),
        advancedRAGTests.runAllTests(),
        orchestrationTests.runAllTests(),
        serviceOrchestrationTests.runAllTests(),
        integrationTests.runAllTests()
      ]);

      setTestResults(integrationResults.results);
      setBenchmarks(integrationResults.benchmarks);
      setAdvancedTestResults(advancedResults);
      setOrchestrationTestResults(orchestrationResults);
      setServiceOrchestrationTestResults(serviceOrchestrationResults);
      setIntegrationTestResults(fullIntegrationResults);

      // Combine summaries
      const combinedSummary = {
        totalTests: integrationResults.summary.totalTests + 
                   advancedResults.length + 
                   orchestrationResults.length + 
                   serviceOrchestrationResults.length +
                   fullIntegrationResults.length,
        passed: integrationResults.summary.passed + 
               advancedResults.filter(r => r.passed).length + 
               orchestrationResults.filter(r => r.passed).length + 
               serviceOrchestrationResults.filter(r => r.passed).length +
               fullIntegrationResults.filter(r => r.passed).length,
        failed: integrationResults.summary.failed + 
               advancedResults.filter(r => !r.passed).length + 
               orchestrationResults.filter(r => !r.passed).length + 
               serviceOrchestrationResults.filter(r => !r.passed).length +
               fullIntegrationResults.filter(r => !r.passed).length,
        averageDuration: [
          integrationResults.summary.averageDuration,
          advancedResults.reduce((sum, r) => sum + r.duration, 0) / (advancedResults.length || 1),
          orchestrationResults.reduce((sum, r) => sum + r.duration, 0) / (orchestrationResults.length || 1),
          serviceOrchestrationResults.reduce((sum, r) => sum + r.duration, 0) / (serviceOrchestrationResults.length || 1),
          fullIntegrationResults.reduce((sum, r) => sum + r.duration, 0) / (fullIntegrationResults.length || 1)
        ].reduce((sum, avg) => sum + avg, 0) / 5
      };
      
      setSummary(combinedSummary);

      return {
        integration: integrationResults,
        advanced: advancedResults,
        orchestration: orchestrationResults,
        serviceOrchestration: serviceOrchestrationResults,
        fullIntegration: fullIntegrationResults,
        summary: combinedSummary
      };
    } catch (error) {
      console.error('Failed to run all RAG tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Get detailed report
  const getDetailedReport = useCallback(() => {
    const integrationReport = ragIntegrationTests.generateDetailedReport();
    const advancedSummary = advancedRAGTests.getTestSummary();
    const orchestrationSummary = orchestrationTests.getTestSummary();
    const serviceOrchestrationSummary = serviceOrchestrationTests.getTestSummary();
    const integrationSummary = integrationTests.getTestSummary();
    
    return {
      ...integrationReport,
      advancedTestResults,
      orchestrationTestResults,
      serviceOrchestrationTestResults,
      integrationTestResults,
      advancedSummary,
      orchestrationSummary,
      serviceOrchestrationSummary,
      integrationSummary
    };
  }, [advancedTestResults, orchestrationTestResults, serviceOrchestrationTestResults, integrationTestResults]);

  // Clear test results
  const clearResults = useCallback(() => {
    setTestResults([]);
    setAdvancedTestResults([]);
    setOrchestrationTestResults([]);
    setServiceOrchestrationTestResults([]);
    setIntegrationTestResults([]);
    setBenchmarks([]);
    setSummary(null);
  }, []);

  return {
    // State
    isRunning,
    testResults,
    advancedTestResults,
    orchestrationTestResults,
    serviceOrchestrationTestResults,
    integrationTestResults,
    benchmarks,
    summary,

    // Actions
    runTests: runTests,
    runAdvancedTests: runAdvancedTests,
    runOrchestrationTests: runOrchestrationTests,
    runServiceOrchestrationTests: runServiceOrchestrationTests,
    runIntegrationTests,
    runAllTests,
    getDetailedReport,
    clearResults
  };
};

export default useRAGTesting;
