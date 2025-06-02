
import React, { useState } from 'react';
import { useRAGTesting } from '@/hooks/useRAGTesting';
import { RAGSystemValidator } from '@/utils/ragSystemValidator';
import { FailedTestsPanel } from './FailedTestsPanel';
import { TestSummaryCard } from './TestSummaryCard';
import { DetailedTestResults } from './DetailedTestResults';
import { TestControlPanel } from './TestControlPanel';
import { SystemValidationResults } from './SystemValidationResults';

export const RAGSystemTestRunner = () => {
  const {
    isRunning,
    testResults,
    orchestrationTestResults,
    serviceOrchestrationTestResults,
    integrationTestResults,
    summary,
    runAllTests,
    runOrchestrationTests,
    runServiceOrchestrationTests,
    runIntegrationTests,
    clearResults
  } = useRAGTesting();

  const [validationResults, setValidationResults] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleRunAllTests = async () => {
    try {
      clearResults();
      console.log('🧪 Starting comprehensive integration tests...');
      const results = await runAllTests();
      console.log('✅ All tests completed:', results);
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }
  };

  const handleSystemValidation = async () => {
    setIsValidating(true);
    try {
      console.log('🔍 Starting system validation...');
      const results = await RAGSystemValidator.validateRefactoredSystem();
      setValidationResults(results);
      console.log('🔍 System validation completed:', results);
    } catch (error) {
      console.error('❌ System validation failed:', error);
      setValidationResults({
        success: false,
        message: `Validation failed: ${error}`,
        details: {
          importExports: false,
          functionality: false,
          performance: false,
          integration: false
        }
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Collect all test results for display
  const getAllTestResults = () => {
    const allResults = [
      ...testResults,
      ...integrationTestResults,
      ...serviceOrchestrationTestResults,
      ...orchestrationTestResults
    ];
    return allResults;
  };

  // Collect all failed tests from all test suites
  const getAllFailedTests = () => {
    const failedTests: Array<{testName: string, error?: string, duration: number, suite: string}> = [];
    
    integrationTestResults.filter(t => !t.passed).forEach(test => 
      failedTests.push({...test, suite: 'Integration Tests'})
    );
    
    serviceOrchestrationTestResults.filter(t => !t.passed).forEach(test => 
      failedTests.push({...test, suite: 'Service Orchestration Tests'})
    );
    
    orchestrationTestResults.filter(t => !t.passed).forEach(test => 
      failedTests.push({...test, suite: 'Orchestration Tests'})
    );

    testResults.filter(t => !t.passed).forEach(test => 
      failedTests.push({...test, suite: 'RAG Integration Tests'})
    );

    return failedTests;
  };

  const allTestResults = getAllTestResults();

  return (
    <div className="space-y-6">
      <TestControlPanel
        isRunning={isRunning}
        summary={summary}
        onRunAllTests={handleRunAllTests}
        onRunOrchestrationTests={runOrchestrationTests}
        onRunServiceOrchestrationTests={runServiceOrchestrationTests}
        onRunIntegrationTests={runIntegrationTests}
        onValidateSystem={handleSystemValidation}
        onClearResults={clearResults}
        isValidating={isValidating}
      />

      {summary && <TestSummaryCard summary={summary} />}

      {/* Show detailed test results right after the summary */}
      {allTestResults.length > 0 && (
        <DetailedTestResults 
          title="All Test Results" 
          results={allTestResults} 
        />
      )}

      {validationResults && (
        <SystemValidationResults validationResults={validationResults} />
      )}
    </div>
  );
};

export default RAGSystemTestRunner;
