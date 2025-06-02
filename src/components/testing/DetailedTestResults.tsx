
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Info } from 'lucide-react';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  metrics?: {
    description?: string;
    [key: string]: any;
  };
}

interface DetailedTestResultsProps {
  title: string;
  results: TestResult[];
}

export const DetailedTestResults = ({ title, results }: DetailedTestResultsProps) => {
  const [expandedTests, setExpandedTests] = useState<string[]>([]);

  const toggleTestExpansion = (testName: string) => {
    setExpandedTests(prev => 
      prev.includes(testName) 
        ? prev.filter(name => name !== testName)
        : [...prev, testName]
    );
  };

  const getTestStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  if (results.length === 0) {
    return null;
  }

  const passedTests = results.filter(t => t.passed);
  const failedTests = results.filter(t => !t.passed);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex gap-2">
            <Badge variant="default" className="bg-green-500">
              {passedTests.length} Passed
            </Badge>
            {failedTests.length > 0 && (
              <Badge variant="destructive">
                {failedTests.length} Failed
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Failed tests first */}
          {failedTests.map((test, index) => {
            const testId = `${test.testName}-${index}`;
            const isExpanded = expandedTests.includes(testId);
            
            return (
              <Collapsible key={testId}>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleTestExpansion(testId)}
                >
                  <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                    <div className="flex items-center gap-3">
                      {getTestStatusIcon(test.passed)}
                      <div className="text-left">
                        <div className="font-medium">{test.testName}</div>
                        {test.metrics?.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {test.metrics.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">FAIL</Badge>
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
                        <span className="font-semibold">Duration:</span> {test.duration.toFixed(2)}ms
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Passed tests */}
          {passedTests.map((test, index) => {
            const testId = `${test.testName}-passed-${index}`;
            const isExpanded = expandedTests.includes(testId);
            
            return (
              <Collapsible key={testId}>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleTestExpansion(testId)}
                >
                  <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                    <div className="flex items-center gap-3">
                      {getTestStatusIcon(test.passed)}
                      <div className="text-left">
                        <div className="font-medium">{test.testName}</div>
                        {test.metrics?.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {test.metrics.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">PASS</Badge>
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
                  <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-700">
                        <Info className="h-4 w-4" />
                        <span className="font-semibold">Test Passed Successfully</span>
                      </div>
                      {test.metrics && Object.keys(test.metrics).filter(key => key !== 'description').length > 0 && (
                        <div>
                          <span className="font-semibold text-green-700">Test Results:</span>
                          <div className="mt-1 text-sm text-green-600 bg-white p-2 rounded border">
                            {Object.entries(test.metrics)
                              .filter(([key]) => key !== 'description')
                              .map(([key, value]) => (
                                <div key={key}>
                                  <strong>{key}:</strong> {JSON.stringify(value)}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
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
  );
};
