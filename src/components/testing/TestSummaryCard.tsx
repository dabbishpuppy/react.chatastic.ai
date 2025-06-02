
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  averageDuration: number;
}

interface TestSummaryCardProps {
  summary: TestSummary;
}

export const TestSummaryCard = ({ summary }: TestSummaryCardProps) => {
  return (
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
  );
};
