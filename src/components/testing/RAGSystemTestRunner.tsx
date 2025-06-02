
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRAGTesting } from '@/hooks/useRAGTesting';
import { RAGSystemValidator } from '@/utils/ragSystemValidator';
import { CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [expandedFailures, setExpandedFailures] = useState<string[]>([]);

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

  const toggleFailureExpansion = (testId: string) => {
    setExpandedFailures(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
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

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.totalTests}</div>
                <div className="text-sm text-gray-600">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {summary.averageDuration.toFixed(1)}ms
                </div>
                <div className="text-sm text-gray-600">Avg Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {failedTests.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Failed Tests ({failedTests.length})
            </CardTitle>
            <CardDescription>
              Click on any failed test to see detailed error information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedTests.map((test, index) => {
                const testId = `${test.suite}-${test.testName}-${index}`;
                const isExpanded = expandedFailures.includes(testId);
                
                return (
                  <Collapsible key={testId}>
                    <CollapsibleTrigger 
                      className="w-full"
                      onClick={() => toggleFailureExpansion(testId)}
                    >
                      <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-left">
                            {test.testName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {test.suite}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {test.duration.toFixed(2)}ms
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="space-y-2">
                          <div>
                            <span className="font-semibold text-red-700">Error Details:</span>
                            <pre className="mt-1 text-sm text-red-600 whitespace-pre-wrap bg-white p-2 rounded border">
                              {test.error || 'No error message available'}
                            </pre>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-semibold">Test Suite:</span> {test.suite}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-semibold">Duration:</span> {test.duration.toFixed(2)}ms
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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

      {integrationTestResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Integration Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {integrationTestResults.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getTestStatusIcon(test.passed)}
                    <span className="font-medium">{test.testName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={test.passed ? "default" : "destructive"}>
                      {test.passed ? "PASS" : "FAIL"}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {test.duration.toFixed(2)}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {serviceOrchestrationTestResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Service Orchestration Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {serviceOrchestrationTestResults.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getTestStatusIcon(test.passed)}
                    <span className="font-medium">{test.testName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={test.passed ? "default" : "destructive"}>
                      {test.passed ? "PASS" : "FAIL"}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {test.duration.toFixed(2)}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {orchestrationTestResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Orchestration Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orchestrationTestResults.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getTestStatusIcon(test.passed)}
                    <span className="font-medium">{test.testName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={test.passed ? "default" : "destructive"}>
                      {test.passed ? "PASS" : "FAIL"}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {test.duration.toFixed(2)}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RAGSystemTestRunner;
