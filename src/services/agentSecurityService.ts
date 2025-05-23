
import { supabase } from "@/integrations/supabase/client";

// Get the agent security settings including rate limiting from the database
export const getAgentSecuritySettings = async (agentId: string) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('visibility, rate_limit_enabled, rate_limit_messages, rate_limit_time_window, rate_limit_message')
      .eq('id', agentId)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching agent security settings:', error);
      // If there's an error, we assume the agent is private for security
      return { visibility: 'private', rate_limit_enabled: false, rate_limit_messages: 20, rate_limit_time_window: 240, rate_limit_message: 'Too many messages in a row' };
    }
    
    // If no agent found, return null
    if (!data) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching agent security settings:', error);
    // If there's an error, we assume the agent is private for security
    return { visibility: 'private', rate_limit_enabled: false, rate_limit_messages: 20, rate_limit_time_window: 240, rate_limit_message: 'Too many messages in a row' };
  }
};

// Update agent security settings in the database
export const updateAgentSecuritySettings = async (agentId: string, settings: {
  visibility: string;
  rate_limit_enabled: boolean;
  rate_limit_messages: number;
  rate_limit_time_window: number;
  rate_limit_message: string;
}) => {
  try {
    // Check if user is authenticated before attempting update
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to update agent security settings');
    }
    
    const { data, error } = await supabase
      .from('agents')
      .update({
        visibility: settings.visibility,
        rate_limit_enabled: settings.rate_limit_enabled,
        rate_limit_messages: settings.rate_limit_messages,
        rate_limit_time_window: settings.rate_limit_time_window,
        rate_limit_message: settings.rate_limit_message
      })
      .eq('id', agentId)
      .select()
      .maybeSingle();
      
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating agent security settings:', error);
    throw error;
  }
};
