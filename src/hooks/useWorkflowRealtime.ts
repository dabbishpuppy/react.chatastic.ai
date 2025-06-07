
import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { WorkflowRealtimeService } from '@/services/workflow/WorkflowRealtimeService';
import { WorkflowEventPayload } from '@/services/workflow/types';

interface UseWorkflowRealtimeOptions {
  sourceId?: string;
  onEvent?: (event: WorkflowEventPayload) => void;
}

export const useWorkflowRealtime = (options: UseWorkflowRealtimeOptions = {}) => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  const { sourceId, onEvent } = options;

  const handleWorkflowEvent = useCallback((event: WorkflowEventPayload) => {
    console.log('🔄 Workflow event received:', event);

    // Call custom event handler if provided
    if (onEvent) {
      onEvent(event);
    }

    // Update React Query cache based on event type
    if (event.event_type === 'STATUS_CHANGE' || event.event_type === 'CRAWL_COMPLETED') {
      // Invalidate sources queries to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ['sources-paginated', agentId, 'website']
      });
      
      queryClient.invalidateQueries({
        queryKey: ['agent-source-stats', agentId]
      });
    }

    // Handle specific events
    switch (event.event_type) {
      case 'CRAWL_STARTED':
        console.log(`🚀 Crawl started for source: ${event.source_id}`);
        break;
        
      case 'CRAWL_COMPLETED':
        console.log(`✅ Crawl completed for source: ${event.source_id}`);
        break;
        
      case 'TRAINING_STARTED':
        console.log(`🎓 Training started for source: ${event.source_id}`);
        break;
        
      case 'PAGE_CRAWL_COMPLETED':
        console.log(`📄 Page crawl completed: ${event.page_id}`);
        break;
        
      case 'MARKED_PENDING_REMOVAL':
        console.log(`⏳ Source marked for removal: ${event.source_id}`);
        break;
        
      case 'SOURCE_RESTORED':
        console.log(`🔄 Source restored: ${event.source_id}`);
        break;
        
      case 'SOURCE_DELETED':
        console.log(`🗑️ Source deleted: ${event.source_id}`);
        // Remove from cache immediately
        queryClient.setQueryData(['sources-paginated', agentId, 'website', 1, 25], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            sources: old.sources.filter((s: any) => s.id !== event.source_id),
            totalCount: old.totalCount - 1
          };
        });
        break;
    }
  }, [agentId, queryClient, onEvent]);

  useEffect(() => {
    if (!agentId) return;

    let unsubscribe: (() => void) | undefined;

    if (sourceId) {
      // Subscribe to specific source
      unsubscribe = WorkflowRealtimeService.subscribeToSource(sourceId, handleWorkflowEvent);
    } else {
      // Subscribe to all events for this agent's sources
      unsubscribe = WorkflowRealtimeService.subscribeToAllEvents((event) => {
        // Only handle events for sources belonging to this agent
        // Note: We could add agent_id to workflow_events table for better filtering
        handleWorkflowEvent(event);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [agentId, sourceId, handleWorkflowEvent]);

  return {
    // Could add state here for connection status, etc.
  };
};
