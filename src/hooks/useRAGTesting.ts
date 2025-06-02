
import { useState, useCallback } from 'react';
import { 
  ragIntegrationTests, 
  advancedRAGTests,
  type TestResult, 
  type PerformanceBenchmark,
  type AdvancedRAGTestResult
} from '@/services/rag/testing';

export const useRAGTesting = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [advancedTestResults, setAdvancedTestResults] = useState<AdvancedRAGTestResult[]>([]);
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

  // Run all tests (integration + advanced)
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const [integrationResults, advancedResults] = await Promise.all([
        ragIntegrationTests.runAllTests(),
        advancedRAGTests.runAllTests()
      ]);

      setTestResults(integrationResults.results);
      setBenchmarks(integrationResults.benchmarks);
      setAdvancedTestResults(advancedResults);

      // Combine summaries
      const combinedSummary = {
        totalTests: integrationResults.summary.totalTests + advancedResults.length,
        passed: integrationResults.summary.passed + advancedResults.filter(r => r.passed).length,
        failed: integrationResults.summary.failed + advancedResults.filter(r => !r.passed).length,
        averageDuration: (integrationResults.summary.averageDuration + 
          (advancedResults.reduce((sum, r) => sum + r.duration, 0) / advancedResults.length || 0)) / 2
      };
      
      setSummary(combinedSummary);

      return {
        integration: integrationResults,
        advanced: advancedResults,
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
    
    return {
      ...integrationReport,
      advancedTestResults,
      advancedSummary
    };
  }, [advancedTestResults]);

  // Clear test results
  const clearResults = useCallback(() => {
    setTestResults([]);
    setAdvancedTestResults([]);
    setBenchmarks([]);
    setSummary(null);
  }, []);

  return {
    // State
    isRunning,
    testResults,
    advancedTestResults,
    benchmarks,
    summary,

    // Actions
    runTests,
    runAdvancedTests,
    runAllTests,
    getDetailedReport,
    clearResults
  };
};

export default useRAGTesting;
