import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWorkflowRealtime } from './useWorkflowRealtime';

export const useRealtimeSourceStatus = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();

  // Use the new workflow real-time system
  useWorkflowRealtime({
    onEvent: (event) => {
      console.log('📡 Workflow event received in useRealtimeSourceStatus:', event);
      
      // Update the cache with real-time data
      queryClient.setQueryData(['sources-paginated', agentId, 'website', 1, 25], (old: any) => {
        if (!old) return old;

        const sources = [...old.sources];
        
        // Find the source and update its workflow status
        const sourceIndex = sources.findIndex(s => s.id === event.source_id);
        if (sourceIndex !== -1) {
          sources[sourceIndex] = {
            ...sources[sourceIndex],
            workflow_status: event.to_status,
            // Also update legacy crawl_status for backward compatibility
            crawl_status: event.to_status.toLowerCase(),
            updated_at: new Date().toISOString(),
            // Add workflow metadata
            workflow_metadata: {
              ...sources[sourceIndex].workflow_metadata,
              ...event.metadata,
              last_workflow_event: event.event_type,
              last_workflow_update: new Date().toISOString()
            }
          };
        }

        return {
          ...old,
          sources
        };
      });

      // Emit custom events for UI components that listen to them (backward compatibility)
      if (event.event_type === 'CRAWL_STARTED') {
        window.dispatchEvent(new CustomEvent('sourceCreated', {
          detail: { 
            sourceId: event.source_id, 
            agentId,
            sourceType: 'website'
          }
        }));
      } else if (event.event_type === 'STATUS_CHANGE' || event.event_type === 'CRAWL_COMPLETED') {
        window.dispatchEvent(new CustomEvent('sourceUpdated', {
          detail: { sourceId: event.source_id }
        }));
      } else if (event.event_type === 'SOURCE_DELETED') {
        window.dispatchEvent(new CustomEvent('sourceRemoved', {
          detail: { sourceId: event.source_id }
        }));
      } else if (event.event_type === 'SOURCE_RESTORED') {
        window.dispatchEvent(new CustomEvent('sourceRestored', {
          detail: { sourceId: event.source_id }
        }));
      }
    }
  });

  // Keep the legacy subscription for existing agent_sources table changes
  useEffect(() => {
    if (!agentId) return;

    console.log('🔌 Setting up legacy real-time source status subscription for agent:', agentId);

    // Subscribe to agent_sources table changes for backward compatibility
    const channel = supabase
      .channel('legacy-source-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📡 Legacy real-time source update received:', payload);
          
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // Update the cache with real-time data
          queryClient.setQueryData(['sources-paginated', agentId, 'website', 1, 25], (old: any) => {
            if (!old) return old;

            const sources = [...old.sources];
            
            if (eventType === 'INSERT' && newRecord) {
              // Add new source (but avoid duplicates from optimistic updates)
              const existingIndex = sources.findIndex(s => s.id === newRecord.id);
              if (existingIndex === -1) {
                sources.unshift(newRecord);
              }
            } else if (eventType === 'UPDATE' && newRecord) {
              // Update existing source
              const existingIndex = sources.findIndex(s => s.id === newRecord.id);
              if (existingIndex !== -1) {
                sources[existingIndex] = { ...sources[existingIndex], ...newRecord };
              }
            } else if (eventType === 'DELETE' && oldRecord) {
              // Remove deleted source
              const existingIndex = sources.findIndex(s => s.id === oldRecord.id);
              if (existingIndex !== -1) {
                sources.splice(existingIndex, 1);
              }
            }

            return {
              ...old,
              sources
            };
          });

          // Emit legacy custom events
          if (eventType === 'INSERT' && newRecord) {
            window.dispatchEvent(new CustomEvent('sourceCreated', {
              detail: { 
                sourceId: newRecord.id, 
                agentId,
                sourceType: newRecord.source_type 
              }
            }));
          } else if (eventType === 'UPDATE' && newRecord) {
            window.dispatchEvent(new CustomEvent('sourceUpdated', {
              detail: { sourceId: newRecord.id }
            }));
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      console.log('🔌 Cleaning up legacy real-time source status subscription');
      supabase.removeChannel(channel);
    };
  }, [agentId, queryClient]);
};
