
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useJobProcessorManager } from '@/hooks/useJobProcessorManager';
import { useWorkflowSystem } from '@/hooks/useWorkflowSystem';
import { Activity, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const WorkflowStatusCard: React.FC = () => {
  const { isInitialized, isInitializing, error } = useWorkflowSystem();
  const { 
    isStarted, 
    processorStatus, 
    startProcessors, 
    stopProcessors,
    isLoading 
  } = useJobProcessorManager();

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (isInitializing) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (isInitialized && isStarted) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isInitializing) return 'Starting...';
    if (isInitialized && isStarted) return 'Active';
    return 'Inactive';
  };

  const getStatusColor = () => {
    if (error) return 'bg-red-100 text-red-800';
    if (isInitializing) return 'bg-blue-100 text-blue-800';
    if (isInitialized && isStarted) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const activeProcessors = Object.entries(processorStatus).filter(
    ([, status]) => status.isRunning
  ).length;

  const totalProcessors = Object.keys(processorStatus).length;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>Workflow System</span>
          </div>
          <Badge className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Background Processors</span>
          <span className="font-medium">
            {activeProcessors}/{totalProcessors} active
          </span>
        </div>

        {isInitialized && (
          <div className="flex gap-2">
            <Button
              onClick={startProcessors}
              disabled={isLoading || isStarted}
              size="sm"
              className="flex-1"
            >
              Start All
            </Button>
            <Button
              onClick={stopProcessors}
              disabled={isLoading || !isStarted}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Stop All
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowStatusCard;
