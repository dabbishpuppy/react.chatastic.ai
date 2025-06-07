
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useJobProcessorManager } from '@/hooks/useJobProcessorManager';
import { Loader2, Play, Square, AlertCircle } from 'lucide-react';

const WorkflowStatusDashboard: React.FC = () => {
  const {
    isStarted,
    processorStatus,
    isLoading,
    error,
    startProcessors,
    stopProcessors,
    startProcessor,
    stopProcessor
  } = useJobProcessorManager();

  const getStatusIcon = (isRunning: boolean) => {
    return isRunning ? (
      <Loader2 className="h-4 w-4 animate-spin text-green-500" />
    ) : (
      <Square className="h-4 w-4 text-gray-500" />
    );
  };

  const getStatusBadge = (isRunning: boolean) => {
    return isRunning ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Running
      </Badge>
    ) : (
      <Badge variant="secondary">
        Stopped
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5" />
          Workflow Background Processors
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Global Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="font-medium">Global Status:</span>
            {getStatusBadge(isStarted)}
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={startProcessors}
              disabled={isLoading || isStarted}
              size="sm"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start All
            </Button>
            
            <Button
              onClick={stopProcessors}
              disabled={isLoading || !isStarted}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop All
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Individual Processor Status */}
        <div className="grid gap-4">
          <h3 className="text-lg font-semibold">Individual Processors</h3>
          
          {Object.entries(processorStatus).map(([jobType, status]) => (
            <div key={jobType} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(status.isRunning)}
                <div>
                  <h4 className="font-medium capitalize">
                    {jobType.replace('_', ' ')} Processor
                  </h4>
                  <p className="text-sm text-gray-600">
                    Handles {jobType === 'crawl_pages' ? 'website crawling' : 'content training'} jobs
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {getStatusBadge(status.isRunning)}
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => startProcessor(jobType)}
                    disabled={isLoading || status.isRunning}
                    size="sm"
                    variant="outline"
                  >
                    Start
                  </Button>
                  
                  <Button
                    onClick={() => stopProcessor(jobType)}
                    disabled={isLoading || !status.isRunning}
                    size="sm"
                    variant="outline"
                  >
                    Stop
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Information */}
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Crawl processors handle website discovery and content extraction</p>
          <p>• Training processors handle content chunking and embedding generation</p>
          <p>• Processors automatically poll for pending jobs every 10 seconds</p>
          <p>• Failed jobs are automatically retried with exponential backoff</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowStatusDashboard;
