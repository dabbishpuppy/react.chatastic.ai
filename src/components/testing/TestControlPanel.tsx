
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

interface TestControlPanelProps {
  isRunning: boolean;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    averageDuration: number;
  } | null;
  onRunAllTests: () => void;
  onRunOrchestrationTests: () => void;
  onRunServiceOrchestrationTests: () => void;
  onRunIntegrationTests: () => void;
  onValidateSystem: () => void;
  onClearResults: () => void;
  isValidating: boolean;
}

export const TestControlPanel: React.FC<TestControlPanelProps> = ({
  isRunning,
  summary,
  onRunAllTests,
  onRunOrchestrationTests,
  onRunServiceOrchestrationTests,
  onRunIntegrationTests,
  onValidateSystem,
  onClearResults,
  isValidating
}) => {
  const getProgressPercentage = () => {
    if (!summary) return 0;
    return summary.totalTests > 0 ? (summary.passed / summary.totalTests) * 100 : 0;
  };

  return (
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
            onClick={onRunAllTests} 
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          <Button 
            onClick={onRunOrchestrationTests} 
            disabled={isRunning}
            variant="outline"
          >
            Orchestration Tests
          </Button>
          <Button 
            onClick={onRunServiceOrchestrationTests} 
            disabled={isRunning}
            variant="outline"
          >
            Service Tests
          </Button>
          <Button 
            onClick={onRunIntegrationTests} 
            disabled={isRunning}
            variant="outline"
          >
            Integration Tests
          </Button>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={onValidateSystem} 
            disabled={isValidating}
            variant="secondary"
          >
            {isValidating ? 'Validating...' : 'Validate System'}
          </Button>
          <Button onClick={onClearResults} variant="ghost">
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
  );
};
