
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FailedTest {
  testName: string;
  error?: string;
  duration: number;
  suite: string;
}

interface FailedTestsPanelProps {
  failedTests: FailedTest[];
}

export const FailedTestsPanel = ({ failedTests }: FailedTestsPanelProps) => {
  const [expandedFailures, setExpandedFailures] = useState<string[]>([]);

  const toggleFailureExpansion = (testId: string) => {
    setExpandedFailures(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  if (failedTests.length === 0) {
    return null;
  }

  return (
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
  );
};
