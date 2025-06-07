
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeSourceStatus = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!agentId) return;

    console.log('🔌 Setting up real-time source status subscription for agent:', agentId);

    // Subscribe to agent_sources table changes
    const channel = supabase
      .channel('source-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📡 Real-time source update received:', payload);
          
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

          // Emit custom events for UI components that listen to them
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
      console.log('🔌 Cleaning up real-time source status subscription');
      supabase.removeChannel(channel);
    };
  }, [agentId, queryClient]);
};
