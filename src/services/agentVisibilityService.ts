
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
      console.error('Error fetching agent visibility:', error);
      // If there's an error, we assume the agent is private for security
      return { visibility: 'private' };
    }
    
    // If no agent found, return null
    if (!data) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching agent visibility:', error);
    // If there's an error, we assume the agent is private for security
    return { visibility: 'private' };
  }
};

// Update agent visibility in the database
export const updateAgentVisibility = async (agentId: string, visibility: string) => {
  try {
    // Check if user is authenticated before attempting update
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update agent visibility');
    }
    
    const { data, error } = await supabase
      .from('agents')
      .update({ visibility })
      .eq('id', agentId)
      .select()
      .maybeSingle();
      
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating agent visibility:', error);
    throw error;
  }
};
