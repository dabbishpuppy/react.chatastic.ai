
import React from 'react';
import { Button } from '@/components/ui/button';
import { useWorkflowCrawlIntegration } from '@/hooks/useWorkflowCrawlIntegration';
import { AgentSource } from '@/types/rag';
import { WorkflowIntegrationService } from '@/services/workflow/WorkflowIntegrationService';
import { Play, RotateCcw, GraduationCap, Trash2, Undo2 } from 'lucide-react';

interface SourceWorkflowActionsProps {
  source: AgentSource;
  onUpdate?: () => void;
  compact?: boolean;
}

const SourceWorkflowActions: React.FC<SourceWorkflowActionsProps> = ({
  source,
  onUpdate,
  compact = false
}) => {
  const {
    initiateWebsiteCrawl,
    initiateTraining,
    markSourceForRemoval,
    restoreSource,
    isLoading
  } = useWorkflowCrawlIntegration();

  const isPendingRemoval = WorkflowIntegrationService.isPendingRemoval(source);
  const canRestore = WorkflowIntegrationService.canRestore(source);
  const displayStatus = WorkflowIntegrationService.getDisplayStatus(source);

  const handleCrawl = async () => {
    if (!source.url) return;
    
    try {
      await initiateWebsiteCrawl(source.agent_id, source.id, source.url, {
        crawlMode: 'full-website',
        maxPages: 100,
        maxDepth: 3,
        respectRobots: true
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error starting crawl:', error);
    }
  };

  const handleTraining = async () => {
    try {
      await initiateTraining(source.id);
      onUpdate?.();
    } catch (error) {
      console.error('Error starting training:', error);
    }
  };

  const handleMarkForRemoval = async () => {
    try {
      await markSourceForRemoval(source);
      onUpdate?.();
    } catch (error) {
      console.error('Error marking for removal:', error);
    }
  };

  const handleRestore = async () => {
    try {
      await restoreSource(source);
      onUpdate?.();
    } catch (error) {
      console.error('Error restoring source:', error);
    }
  };

  if (isPendingRemoval) {
    return (
      <div className="flex gap-2">
        {canRestore && (
          <Button
            onClick={handleRestore}
            disabled={isLoading}
            variant="outline"
            size={compact ? "sm" : "default"}
            className="flex items-center gap-2"
          >
            <Undo2 className="h-4 w-4" />
            {!compact && "Restore"}
          </Button>
        )}
      </div>
    );
  }

  const showCrawlButton = ['pending', 'failed', 'CREATED', 'ERROR'].includes(displayStatus);
  const showRecrawlButton = ['completed', 'trained', 'COMPLETED', 'TRAINED'].includes(displayStatus);
  const showTrainButton = ['completed', 'crawled', 'COMPLETED', 'ready_for_training'].includes(displayStatus);

  return (
    <div className="flex gap-2">
      {showCrawlButton && (
        <Button
          onClick={handleCrawl}
          disabled={isLoading}
          size={compact ? "sm" : "default"}
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          {!compact && "Crawl"}
        </Button>
      )}
      
      {showRecrawlButton && (
        <Button
          onClick={handleCrawl}
          disabled={isLoading}
          variant="outline"
          size={compact ? "sm" : "default"}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {!compact && "Recrawl"}
        </Button>
      )}
      
      {showTrainButton && (
        <Button
          onClick={handleTraining}
          disabled={isLoading}
          variant="outline"
          size={compact ? "sm" : "default"}
          className="flex items-center gap-2"
        >
          <GraduationCap className="h-4 w-4" />
          {!compact && "Train"}
        </Button>
      )}
      
      <Button
        onClick={handleMarkForRemoval}
        disabled={isLoading}
        variant="ghost"
        size={compact ? "sm" : "default"}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
        {!compact && "Remove"}
      </Button>
    </div>
  );
};

export default SourceWorkflowActions;
