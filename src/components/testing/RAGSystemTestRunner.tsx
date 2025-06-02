
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRAGTesting } from '@/hooks/useRAGTesting';
import { RAGSystemValidator } from '@/utils/ragSystemValidator';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { FailedTestsPanel } from './FailedTestsPanel';
import { TestSummaryCard } from './TestSummaryCard';
import { TestResultsCard } from './TestResultsCard';

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

  const getTestStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getProgressPercentage = () => {
    if (!summary) return 0;
    return summary.totalTests > 0 ? (summary.passed / summary.totalTests) * 100 : 0;
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

    return failedTests;
  };

  const failedTests = getAllFailedTests();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            RAG System Integration Tests
          </CardTitle>
          <CardDescription>
            Comprehensive testing suite for refactored orchestration services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleRunAllTests} 
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            <Button 
              onClick={runOrchestrationTests} 
              disabled={isRunning}
              variant="outline"
            >
              Orchestration Tests
            </Button>
            <Button 
              onClick={runServiceOrchestrationTests} 
              disabled={isRunning}
              variant="outline"
            >
              Service Tests
            </Button>
            <Button 
              onClick={runIntegrationTests} 
              disabled={isRunning}
              variant="outline"
            >
              Integration Tests
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSystemValidation} 
              disabled={isValidating}
              variant="secondary"
            >
              {isValidating ? 'Validating...' : 'Validate System'}
            </Button>
            <Button onClick={clearResults} variant="ghost">
              Clear Results
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running tests...</span>
                <span>{summary ? `${summary.passed}/${summary.totalTests}` : '0/0'}</span>
              </div>
              <Progress value={getProgressPercentage()} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {summary && <TestSummaryCard summary={summary} />}

      <FailedTestsPanel failedTests={failedTests} />

      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResults.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              System Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50">
              <p className={validationResults.success ? 'text-green-700' : 'text-red-700'}>
                {validationResults.message}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {getTestStatusIcon(validationResults.details.importExports)}
                <span>Import/Export Chains</span>
              </div>
              <div className="flex items-center gap-2">
                {getTestStatusIcon(validationResults.details.functionality)}
                <span>Core Functionality</span>
              </div>
              <div className="flex items-center gap-2">
                {getTestStatusIcon(validationResults.details.performance)}
                <span>Performance Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                {getTestStatusIcon(validationResults.details.integration)}
                <span>Service Integration</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <TestResultsCard 
        title="Integration Test Results" 
        results={integrationTestResults} 
      />

      <TestResultsCard 
        title="Service Orchestration Test Results" 
        results={serviceOrchestrationTestResults} 
      />

      <TestResultsCard 
        title="Orchestration Test Results" 
        results={orchestrationTestResults} 
      />
    </div>
  );
};

export default RAGSystemTestRunner;
