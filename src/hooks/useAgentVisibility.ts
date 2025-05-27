
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAgentVisibility = (agentId?: string) => {
  const [agentVisibility, setAgentVisibility] = useState<string | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState(true);

  useEffect(() => {
    const fetchAgentVisibility = async () => {
      if (!agentId) return;
      
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('visibility')
          .eq('id', agentId)
          .single();
          
        if (error) {
          console.error("Error fetching agent visibility:", error);
          return;
        }
        
        if (data) {
          setAgentVisibility(data.visibility);
        }
      } catch (error) {
        console.error("Error in fetchAgentVisibility:", error);
      } finally {
        setVisibilityLoading(false);
      }
    };
    
    fetchAgentVisibility();
  }, [agentId]);

  return { agentVisibility, visibilityLoading };
};
