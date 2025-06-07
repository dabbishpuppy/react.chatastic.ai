
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMaybeSingle } from "@/utils/safeSupabaseQueries";

export const useAgentExists = (agentId?: string) => {
  const [agentExists, setAgentExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAgentExists = async () => {
      if (!agentId) {
        setAgentExists(false);
        setIsLoading(false);
        return;
      }
      
      try {
        const agent = await fetchMaybeSingle(
          supabase
            .from('agents')
            .select('id')
            .eq('id', agentId),
          `useAgentExists(${agentId})`
        );
        
        setAgentExists(agent !== null);
      } catch (error) {
        console.error("Error checking agent existence:", error);
        setAgentExists(false); // Fail safe
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAgentExists();
  }, [agentId]);

  return { agentExists, isLoading };
};
