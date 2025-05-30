import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// This hook is now deprecated in favor of useAgentSourceStats
// Keep it for backward compatibility but it returns a simple timestamp
export const useSourcesRealtimeSubscription = () => {
  const { agentId } = useParams();
  const [realtimeSize, setRealtimeSize] = useState(0);

  useEffect(() => {
    if (!agentId) return;

    console.log('⚠️ useSourcesRealtimeSubscription is deprecated, use useAgentSourceStats instead');
    
    // Just return a timestamp to satisfy existing consumers
    setRealtimeSize(Date.now());

    // No subscription needed since useAgentSourceStats handles this
    return () => {};
  }, [agentId]);

  return realtimeSize;
};
