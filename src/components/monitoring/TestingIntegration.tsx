
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TestTube, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useRAGTesting } from '@/hooks/useRAGTesting';

export const TestingIntegration: React.FC = () => {
  const {
    isRunning,
    summary,
    runAllTests,
    runOrchestrationTests,
    runServiceOrchestrationTests,
    runIntegrationTests,
    clearResults
  } = useRAGTesting();

  const [lastTestRun, setLastTestRun] = useState<Date | null>(null);

  const handleRunQuickTest = async () => {
    try {
      await runIntegrationTests();
      setLastTestRun(new Date());
    } catch (error) {
      console.error('Quick test failed:', error);
    }
  };

  const handleRunFullTest = async () => {
    try {
      await runAllTests();
      setLastTestRun(new Date());
    } catch (error) {
      console.error('Full test suite failed:', error);
    }
  };

  const getTestStatusIcon = () => {
    if (isRunning) return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    if (!summary) return <TestTube className="h-4 w-4 text-gray-500" />;
    if (summary.failed === 0) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getProgressPercentage = () => {
    if (!summary) return 0;
    return summary.totalTests > 0 ? (summary.passed / summary.totalTests) * 100 : 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          System Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleRunQuickTest}
            disabled={isRunning}
            size="sm"
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            Quick Test
          </Button>
          <Button 
            onClick={handleRunFullTest}
            disabled={isRunning}
            size="sm"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Full Suite
          </Button>
        </div>

        {/* Test Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getTestStatusIcon()}
              <span className="text-sm font-medium">
                {isRunning ? 'Running Tests...' : 'Test Status'}
              </span>
            </div>
            {lastTestRun && (
              <span className="text-xs text-muted-foreground">
                Last run: {lastTestRun.toLocaleTimeString()}
              </span>
            )}
          </div>

          {summary && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tests: {summary.passed}/{summary.totalTests}</span>
                <span className={summary.failed > 0 ? 'text-red-600' : 'text-green-600'}>
                  {summary.failed === 0 ? 'All Passed' : `${summary.failed} Failed`}
                </span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
          )}

          {summary && summary.failed > 0 && (
            <div className="flex items-center gap-1 text-red-600 text-sm">
              <AlertTriangle className="h-3 w-3" />
              <span>Issues detected - check testing tab</span>
            </div>
          )}
        </div>

        {/* Test Categories */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={runOrchestrationTests}
            disabled={isRunning}
            variant="ghost"
            size="sm"
            className="justify-start"
          >
            Orchestration
          </Button>
          <Button
            onClick={runServiceOrchestrationTests}
            disabled={isRunning}
            variant="ghost"
            size="sm"
            className="justify-start"
          >
            Services
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
