
import { supabase } from "@/integrations/supabase/client";

// Get the agent visibility from the database
export const getAgentVisibility = async (agentId: string) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('visibility')
      .eq('id', agentId)
      .maybeSingle();
      
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching agent visibility:', error);
    throw error;
  }
};
