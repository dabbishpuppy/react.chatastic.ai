
import { supabase } from '@/integrations/supabase/client';
import { WorkflowEventPayload } from './types';

export class WorkflowRealtimeService {
  private static channels = new Map<string, any>();
  private static listeners = new Map<string, Set<(event: WorkflowEventPayload) => void>>();

  /**
   * Subscribe to workflow events for a specific source
   */
  static subscribeToSource(
    sourceId: string,
    callback: (event: WorkflowEventPayload) => void
  ): () => void {
    const channelKey = `source:${sourceId}`;
    
    // Add callback to listeners
    if (!this.listeners.has(channelKey)) {
      this.listeners.set(channelKey, new Set());
    }
    this.listeners.get(channelKey)!.add(callback);

    // Create channel if it doesn't exist
    if (!this.channels.has(channelKey)) {
      console.log(`📡 Creating real-time channel for source: ${sourceId}`);
      
      const channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'workflow_events',
            filter: `source_id=eq.${sourceId}`
          },
          (payload) => {
            console.log('📡 Workflow event received:', payload);
            
            const event = payload.new as any;
            const eventPayload: WorkflowEventPayload = {
              event_id: event.id,
              source_id: event.source_id,
              page_id: event.page_id,
              event_type: event.event_type,
              to_status: event.to_status,
              metadata: event.metadata || {}
            };

            // Notify all listeners for this channel
            const listeners = this.listeners.get(channelKey);
            if (listeners) {
              listeners.forEach(listener => {
                try {
                  listener(eventPayload);
                } catch (error) {
                  console.error('❌ Error in workflow event listener:', error);
                }
              });
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 Workflow channel ${channelKey} status:`, status);
        });

      this.channels.set(channelKey, channel);
    }

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(channelKey);
      if (listeners) {
        listeners.delete(callback);
        
        // If no more listeners, cleanup channel
        if (listeners.size === 0) {
          console.log(`📡 Cleaning up channel for source: ${sourceId}`);
          const channel = this.channels.get(channelKey);
          if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelKey);
          }
          this.listeners.delete(channelKey);
        }
      }
    };
  }

  /**
   * Subscribe to all workflow events (for debugging/monitoring)
   */
  static subscribeToAllEvents(
    callback: (event: WorkflowEventPayload) => void
  ): () => void {
    const channelKey = 'all_workflow_events';
    
    console.log('📡 Creating global workflow events channel');
    
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_events'
        },
        (payload) => {
          const event = payload.new as any;
          const eventPayload: WorkflowEventPayload = {
            event_id: event.id,
            source_id: event.source_id,
            page_id: event.page_id,
            event_type: event.event_type,
            to_status: event.to_status,
            metadata: event.metadata || {}
          };

          try {
            callback(eventPayload);
          } catch (error) {
            console.error('❌ Error in global workflow event listener:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Global workflow channel status:`, status);
      });

    return () => {
      console.log('📡 Cleaning up global workflow events channel');
      supabase.removeChannel(channel);
    };
  }

  /**
   * Cleanup all channels
   */
  static cleanup(): void {
    console.log('📡 Cleaning up all workflow channels');
    
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    
    this.channels.clear();
    this.listeners.clear();
  }
}
