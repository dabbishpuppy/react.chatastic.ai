
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource } from '@/types/rag';

export const useChildSourcesRealtime = (parentSourceId: string, initialChildSources: AgentSource[] = []) => {
  const [childSources, setChildSources] = useState<AgentSource[]>(initialChildSources);

  useEffect(() => {
    setChildSources(initialChildSources);
  }, [initialChildSources]);

  useEffect(() => {
    if (!parentSourceId) return;

    console.log(`📡 Setting up real-time subscription for child sources of parent: ${parentSourceId}`);

    // Subscribe to agent_sources changes for children of this parent
    const channel = supabase
      .channel(`child-sources-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Child source update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newSource = payload.new as AgentSource;
            setChildSources(prev => [...prev, newSource]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedSource = payload.new as AgentSource;
            setChildSources(prev => 
              prev.map(source => 
                source.id === updatedSource.id ? updatedSource : source
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedSource = payload.old as AgentSource;
            setChildSources(prev => 
              prev.filter(source => source.id !== deletedSource.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`🔌 Cleaning up child sources subscription for parent: ${parentSourceId}`);
      supabase.removeChannel(channel);
    };
  }, [parentSourceId]);

  return childSources;
};
