
import { useState, useCallback } from 'react';
import { ragIntegrationTests, type TestResult, type PerformanceBenchmark } from '@/services/rag/testing';

export const useRAGTesting = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
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

  // Get detailed report
  const getDetailedReport = useCallback(() => {
    return ragIntegrationTests.generateDetailedReport();
  }, []);

  // Clear test results
  const clearResults = useCallback(() => {
    setTestResults([]);
    setBenchmarks([]);
    setSummary(null);
  }, []);

  return {
    // State
    isRunning,
    testResults,
    benchmarks,
    summary,

    // Actions
    runTests,
    getDetailedReport,
    clearResults
  };
};

export default useRAGTesting;
