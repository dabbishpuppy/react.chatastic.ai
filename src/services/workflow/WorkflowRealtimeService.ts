
import { supabase } from '@/integrations/supabase/client';
import { WorkflowEventPayload } from './types';

export class WorkflowRealtimeService {
  private static subscriptions: Map<string, any> = new Map();

  /**
   * Subscribe to workflow events for a specific source
   */
  static subscribeToSource(
    sourceId: string, 
    onEvent: (event: WorkflowEventPayload) => void
  ): () => void {
    const channelName = `workflow_source_${sourceId}`;
    
    if (this.subscriptions.has(channelName)) {
      // Already subscribed, just update the callback
      return () => this.unsubscribe(channelName);
    }

    console.log(`🔗 Subscribing to workflow events for source: ${sourceId}`);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'workflow_events',
        filter: `source_id=eq.${sourceId}`
      }, (payload) => {
        console.log('📨 Workflow event received:', payload.new);
        
        const event: WorkflowEventPayload = {
          event_id: payload.new.id,
          source_id: payload.new.source_id,
          page_id: payload.new.page_id,
          event_type: payload.new.event_type,
          to_status: payload.new.to_status,
          metadata: payload.new.metadata || {}
        };

        onEvent(event);
      })
      .subscribe();

    this.subscriptions.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to all workflow events (for admin/monitoring)
   */
  static subscribeToAllEvents(
    onEvent: (event: WorkflowEventPayload) => void
  ): () => void {
    const channelName = 'workflow_events_all';
    
    if (this.subscriptions.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    console.log('🔗 Subscribing to all workflow events');

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'workflow_events'
      }, (payload) => {
        const event: WorkflowEventPayload = {
          event_id: payload.new.id,
          source_id: payload.new.source_id,
          page_id: payload.new.page_id,
          event_type: payload.new.event_type,
          to_status: payload.new.to_status,
          metadata: payload.new.metadata || {}
        };

        onEvent(event);
      })
      .subscribe();

    this.subscriptions.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to background job events
   */
  static subscribeToJobEvents(
    onJobUpdate: (job: any) => void
  ): () => void {
    const channelName = 'background_jobs';
    
    if (this.subscriptions.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    console.log('🔗 Subscribing to background job events');

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'background_jobs'
      }, (payload) => {
        console.log('📨 Job event received:', payload);
        onJobUpdate(payload);
      })
      .subscribe();

    this.subscriptions.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Unsubscribe from a specific channel
   */
  private static unsubscribe(channelName: string): void {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
      console.log(`🔌 Unsubscribed from: ${channelName}`);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  static unsubscribeAll(): void {
    console.log('🔌 Unsubscribing from all workflow events');
    this.subscriptions.forEach((channel, channelName) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
  }

  /**
   * Get current subscription count
   */
  static getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}
