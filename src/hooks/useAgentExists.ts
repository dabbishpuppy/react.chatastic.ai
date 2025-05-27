
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        const { data, error } = await supabase
          .from('agents')
          .select('id')
          .eq('id', agentId)
          .single();
          
        if (error) {
          console.error("Error checking agent existence:", error);
          setAgentExists(false);
        } else {
          setAgentExists(!!data);
        }
      } catch (error) {
        console.error("Error in checkAgentExists:", error);
        setAgentExists(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAgentExists();
  }, [agentId]);

  return { agentExists, isLoading };
};
