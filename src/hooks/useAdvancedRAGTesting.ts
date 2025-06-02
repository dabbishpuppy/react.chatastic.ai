
import { useState, useCallback } from 'react';
import { 
  advancedRAGTests,
  OrchestrationTests,
  ServiceOrchestrationTests,
  IntegrationTests,
  enhancedQueryEngineTests,
  type AdvancedRAGTestResult,
  type OrchestrationTestResult,
  type ServiceOrchestrationTestResult,
  type IntegrationTestResult,
  type EnhancedQueryEngineTestResult
} from '@/services/rag/testing';

export const useAdvancedRAGTesting = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [advancedTestResults, setAdvancedTestResults] = useState<AdvancedRAGTestResult[]>([]);
  const [orchestrationTestResults, setOrchestrationTestResults] = useState<OrchestrationTestResult[]>([]);
  const [serviceOrchestrationTestResults, setServiceOrchestrationTestResults] = useState<ServiceOrchestrationTestResult[]>([]);
  const [integrationTestResults, setIntegrationTestResults] = useState<IntegrationTestResult[]>([]);
  const [enhancedQueryEngineTestResults, setEnhancedQueryEngineTestResults] = useState<EnhancedQueryEngineTestResult[]>([]);

  const runAdvancedTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await advancedRAGTests.runAllTests();
      setAdvancedTestResults(results);
      return results;
    } catch (error) {
      console.error('Failed to run advanced RAG tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const runOrchestrationTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await OrchestrationTests.runAllTests();
      setOrchestrationTestResults(results);
      return results;
    } catch (error) {
      console.error('Failed to run orchestration tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const runServiceOrchestrationTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await ServiceOrchestrationTests.runAllTests();
      setServiceOrchestrationTestResults(results);
      return results;
    } catch (error) {
      console.error('Failed to run service orchestration tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const runIntegrationTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await IntegrationTests.runAllTests();
      setIntegrationTestResults(results);
      return results;
    } catch (error) {
      console.error('Failed to run integration tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const runEnhancedQueryEngineTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await enhancedQueryEngineTests.runAllTests();
      setEnhancedQueryEngineTestResults(results);
      return results;
    } catch (error) {
      console.error('Failed to run enhanced query engine tests:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setAdvancedTestResults([]);
    setOrchestrationTestResults([]);
    setServiceOrchestrationTestResults([]);
    setIntegrationTestResults([]);
    setEnhancedQueryEngineTestResults([]);
  }, []);

  return {
    isRunning,
    advancedTestResults,
    orchestrationTestResults,
    serviceOrchestrationTestResults,
    integrationTestResults,
    enhancedQueryEngineTestResults,
    runAdvancedTests,
    runOrchestrationTests,
    runServiceOrchestrationTests,
    runIntegrationTests,
    runEnhancedQueryEngineTests,
    clearResults
  };
};
