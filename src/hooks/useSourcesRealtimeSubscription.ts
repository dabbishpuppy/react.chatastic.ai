
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const useSourcesRealtimeSubscription = () => {
  const { agentId } = useParams();
  const [realtimeSize, setRealtimeSize] = useState(0);

  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`sources-size-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📡 Sources size update triggered', payload);
          setRealtimeSize(Date.now()); // Force recalculation
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return realtimeSize;
};
