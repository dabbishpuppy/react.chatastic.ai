
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestResultsCardProps {
  title: string;
  results: TestResult[];
}

export const TestResultsCard = ({ title, results }: TestResultsCardProps) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {results.map((test, index) => (
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
  );
};
