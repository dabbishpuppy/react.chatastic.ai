
import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { WebSocketRealtimeService } from '@/services/workflow/WebSocketRealtimeService';
import { useToast } from '@/hooks/use-toast';

interface SourceEvent {
  topic: string;
  type: 'STATUS_CHANGED' | 'PAGE_COMPLETED' | 'SOURCE_COMPLETED' | 'CRAWL_PROGRESS';
  sourceId: string;
  pageId?: string;
  status?: string;
  progress?: number;
  metadata?: any;
}

interface EnhancedRealtimeOptions {
  sourceId?: string;
  onEvent?: (event: SourceEvent) => void;
  showToasts?: boolean;
}

export const useEnhancedWorkflowRealtime = (options: EnhancedRealtimeOptions = {}) => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { sourceId, onEvent, showToasts = true } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [lastEvent, setLastEvent] = useState<SourceEvent | null>(null);
  const [eventCount, setEventCount] = useState(0);

  const handleSourceEvent = useCallback((event: SourceEvent) => {
    console.log('🔄 Enhanced realtime event received:', event);
    
    setLastEvent(event);
    setEventCount(prev => prev + 1);

    // Call custom event handler if provided
    if (onEvent) {
      onEvent(event);
    }

    // Update React Query cache based on event type
    if (event.type === 'STATUS_CHANGED' || event.type === 'SOURCE_COMPLETED') {
      queryClient.invalidateQueries({
        queryKey: ['sources-paginated', agentId, 'website']
      });
      
      queryClient.invalidateQueries({
        queryKey: ['agent-source-stats', agentId]
      });

      // Optimistically update specific source in cache
      queryClient.setQueryData(['source', event.sourceId], (oldData: any) => {
        if (oldData) {
          return {
            ...oldData,
            workflow_status: event.status,
            crawl_status: event.status,
            updated_at: new Date().toISOString()
          };
        }
        return oldData;
      });
    }

    // Show toast notifications for important events
    if (showToasts) {
      switch (event.type) {
        case 'STATUS_CHANGED':
          if (event.status === 'CRAWLING') {
            toast({
              title: "Crawl Started",
              description: "Source crawling has begun.",
              duration: 3000,
            });
          } else if (event.status === 'TRAINING') {
            toast({
              title: "Training Started",
              description: "Source training has begun.",
              duration: 3000,
            });
          } else if (event.status === 'ERROR') {
            toast({
              title: "Error Occurred",
              description: event.metadata?.error || "An error occurred during processing.",
              variant: "destructive",
              duration: 5000,
            });
          }
          break;
          
        case 'SOURCE_COMPLETED':
          if (event.status === 'COMPLETED') {
            toast({
              title: "Crawl Completed",
              description: "Source has been successfully crawled.",
              duration: 4000,
            });
          } else if (event.status === 'TRAINED') {
            toast({
              title: "Training Completed",
              description: "Source has been successfully trained.",
              duration: 4000,
            });
          }
          break;
      }
    }

    // Handle specific removal workflow
    if (event.type === 'STATUS_CHANGED' && event.status === 'REMOVED') {
      // Remove from cache immediately
      queryClient.setQueryData(['sources-paginated', agentId, 'website', 1, 25], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          sources: old.sources.filter((s: any) => s.id !== event.sourceId),
          totalCount: old.totalCount - 1
        };
      });

      if (showToasts) {
        toast({
          title: "Source Removed",
          description: "Source has been permanently deleted.",
          duration: 3000,
        });
      }
    }
  }, [agentId, queryClient, onEvent, showToasts, toast]);

  // Monitor connection status
  useEffect(() => {
    if (!sourceId) return;

    const checkStatus = () => {
      const status = WebSocketRealtimeService.getConnectionStatus(sourceId);
      setConnectionStatus(status);
    };

    // Check status immediately and then periodically
    checkStatus();
    const statusInterval = setInterval(checkStatus, 5000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [sourceId]);

  useEffect(() => {
    if (!sourceId) return;

    console.log(`🔗 Setting up enhanced realtime for source: ${sourceId}`);

    const unsubscribe = WebSocketRealtimeService.subscribeToSource(sourceId, handleSourceEvent);

    return () => {
      console.log(`🔌 Cleaning up enhanced realtime for source: ${sourceId}`);
      unsubscribe();
    };
  }, [sourceId, handleSourceEvent]);

  const reconnect = useCallback(() => {
    if (sourceId) {
      WebSocketRealtimeService.reconnectSource(sourceId);
    }
  }, [sourceId]);

  const getStats = useCallback(() => {
    return WebSocketRealtimeService.getStats();
  }, []);

  return {
    connectionStatus,
    lastEvent,
    eventCount,
    reconnect,
    getStats,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected'
  };
};
