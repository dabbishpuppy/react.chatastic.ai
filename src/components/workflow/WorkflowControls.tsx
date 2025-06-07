
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWorkflowCrawlIntegration } from '@/hooks/useWorkflowCrawlIntegration';
import { AgentSource } from '@/types/rag';
import { SimplifiedSourceStatusService } from '@/services/SimplifiedSourceStatusService';
import { WorkflowIntegrationService } from '@/services/workflow/WorkflowIntegrationService';
import { Play, Square, RotateCcw, Trash2, Undo2 } from 'lucide-react';

interface WorkflowControlsProps {
  source: AgentSource;
  onRefresh?: () => void;
}

const WorkflowControls: React.FC<WorkflowControlsProps> = ({ source, onRefresh }) => {
  const {
    initiateWebsiteCrawl,
    initiateTraining,
    markSourceForRemoval,
    restoreSource,
    isLoading
  } = useWorkflowCrawlIntegration();

  const status = SimplifiedSourceStatusService.getSourceStatus(source);
  const buttonState = SimplifiedSourceStatusService.determineButtonState(source);
  const isPendingRemoval = WorkflowIntegrationService.isPendingRemoval(source);
  const canRestore = WorkflowIntegrationService.canRestore(source);

  const handleCrawl = async () => {
    if (!source.url) return;
    
    try {
      await initiateWebsiteCrawl(source.agent_id, source.id, source.url, {
        crawlMode: 'full-website',
        maxPages: 100,
        maxDepth: 3,
        respectRobots: true
      });
      onRefresh?.();
    } catch (error) {
      console.error('Error starting crawl:', error);
    }
  };

  const handleTraining = async () => {
    try {
      await initiateTraining(source.id);
      onRefresh?.();
    } catch (error) {
      console.error('Error starting training:', error);
    }
  };

  const handleMarkForRemoval = async () => {
    try {
      await markSourceForRemoval(source);
      onRefresh?.();
    } catch (error) {
      console.error('Error marking for removal:', error);
    }
  };

  const handleRestore = async () => {
    try {
      await restoreSource(source);
      onRefresh?.();
    } catch (error) {
      console.error('Error restoring source:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'bg-gray-100 text-gray-800',
      'crawling': 'bg-blue-100 text-blue-800',
      'crawled': 'bg-green-100 text-green-800',
      'training': 'bg-purple-100 text-purple-800',
      'trained': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'ready_for_training': 'bg-yellow-100 text-yellow-800',
      'pending_removal': 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Workflow Controls</span>
          {getStatusBadge(status)}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Current Status:</span> {status}
          </div>
          {source.workflow_status && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Workflow Status:</span> {source.workflow_status}
            </div>
          )}
          {buttonState.showProgress && source.progress !== undefined && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Progress:</span> {source.progress}%
            </div>
          )}
        </div>

        <Separator />

        {/* Control Buttons */}
        <div className="space-y-2">
          {isPendingRemoval ? (
            <div className="space-y-2">
              <p className="text-sm text-orange-600">This source is pending removal.</p>
              {canRestore && (
                <Button
                  onClick={handleRestore}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center gap-2"
                >
                  <Undo2 className="h-4 w-4" />
                  Restore Source
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Crawl Controls */}
              {source.source_type === 'website' && (
                <Button
                  onClick={handleCrawl}
                  disabled={isLoading || !buttonState.canRecrawl}
                  size="sm"
                  className="w-full flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {status === 'pending' ? 'Start Crawl' : 'Re-crawl'}
                </Button>
              )}

              {/* Training Controls */}
              {buttonState.canTrain && (
                <Button
                  onClick={handleTraining}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Start Training
                </Button>
              )}

              {/* Removal Controls */}
              {buttonState.canDelete && (
                <Button
                  onClick={handleMarkForRemoval}
                  disabled={isLoading}
                  variant="destructive"
                  size="sm"
                  className="w-full flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Mark for Removal
                </Button>
              )}
            </>
          )}
        </div>

        {/* Processing Indicator */}
        {isLoading && (
          <div className="text-center text-sm text-gray-600">
            Processing workflow operation...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowControls;
