
import { useState, useCallback } from 'react';
import { 
  ragIntegrationTests, 
  advancedRAGTests,
  orchestrationTests,
  serviceOrchestrationTests,
  type TestResult, 
  type PerformanceBenchmark,
  type AdvancedRAGTestResult,
  type OrchestrationTestResult,
  type ServiceOrchestrationTestResult
} from '@/services/rag/testing';

export const useRAGTesting = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [advancedTestResults, setAdvancedTestResults] = useState<AdvancedRAGTestResult[]>([]);
  const [orchestrationTestResults, setOrchestrationTestResults] = useState<OrchestrationTestResult[]>([]);
  const [serviceOrchestrationTestResults, setServiceOrchestrationTestResults] = useState<ServiceOrchestrationTestResult[]>([]);
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

  // Run all tests (integration + advanced + orchestration + service orchestration)
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const [integrationResults, advancedResults, orchestrationResults, serviceOrchestrationResults] = await Promise.all([
        ragIntegrationTests.runAllTests(),
        advancedRAGTests.runAllTests(),
        orchestrationTests.runAllTests(),
        serviceOrchestrationTests.runAllTests()
      ]);

      setTestResults(integrationResults.results);
      setBenchmarks(integrationResults.benchmarks);
      setAdvancedTestResults(advancedResults);
      setOrchestrationTestResults(orchestrationResults);
      setServiceOrchestrationTestResults(serviceOrchestrationResults);

      // Combine summaries
      const combinedSummary = {
        totalTests: integrationResults.summary.totalTests + 
                   advancedResults.length + 
                   orchestrationResults.length + 
                   serviceOrchestrationResults.length,
        passed: integrationResults.summary.passed + 
               advancedResults.filter(r => r.passed).length + 
               orchestrationResults.filter(r => r.passed).length + 
               serviceOrchestrationResults.filter(r => r.passed).length,
        failed: integrationResults.summary.failed + 
               advancedResults.filter(r => !r.passed).length + 
               orchestrationResults.filter(r => !r.passed).length + 
               serviceOrchestrationResults.filter(r => !r.passed).length,
        averageDuration: [
          integrationResults.summary.averageDuration,
          advancedResults.reduce((sum, r) => sum + r.duration, 0) / (advancedResults.length || 1),
          orchestrationResults.reduce((sum, r) => sum + r.duration, 0) / (orchestrationResults.length || 1),
          serviceOrchestrationResults.reduce((sum, r) => sum + r.duration, 0) / (serviceOrchestrationResults.length || 1)
        ].reduce((sum, avg) => sum + avg, 0) / 4
      };
      
      setSummary(combinedSummary);

      return {
        integration: integrationResults,
        advanced: advancedResults,
        orchestration: orchestrationResults,
        serviceOrchestration: serviceOrchestrationResults,
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
    
    return {
      ...integrationReport,
      advancedTestResults,
      orchestrationTestResults,
      serviceOrchestrationTestResults,
      advancedSummary,
      orchestrationSummary,
      serviceOrchestrationSummary
    };
  }, [advancedTestResults, orchestrationTestResults, serviceOrchestrationTestResults]);

  // Clear test results
  const clearResults = useCallback(() => {
    setTestResults([]);
    setAdvancedTestResults([]);
    setOrchestrationTestResults([]);
    setServiceOrchestrationTestResults([]);
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
    benchmarks,
    summary,

    // Actions
    runTests,
    runAdvancedTests,
    runOrchestrationTests,
    runServiceOrchestrationTests,
    runAllTests,
    getDetailedReport,
    clearResults
  };
};

export default useRAGTesting;
