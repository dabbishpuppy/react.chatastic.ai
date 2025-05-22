
import { supabase } from "@/integrations/supabase/client";
import { ChatInterfaceSettings, SuggestedMessage } from "@/types/chatInterface";

export const saveChatSettings = async (settings: ChatInterfaceSettings): Promise<ChatInterfaceSettings | null> => {
  try {
    if (settings.id) {
      // Update existing settings
      const { data, error } = await supabase
        .from('chat_interface_settings')
        .update({
          initial_message: settings.initial_message,
          suggested_messages: JSON.stringify(settings.suggested_messages),
          message_placeholder: settings.message_placeholder,
          show_feedback: settings.show_feedback,
          allow_regenerate: settings.allow_regenerate,
          theme: settings.theme,
          display_name: settings.display_name,
          profile_picture: settings.profile_picture,
          chat_icon: settings.chat_icon,
          bubble_position: settings.bubble_position,
          show_suggestions_after_chat: settings.show_suggestions_after_chat,
          auto_show_delay: settings.auto_show_delay,
          footer: settings.footer,
          updated_at: new Date(),
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('chat_interface_settings')
        .insert({
          agent_id: settings.agent_id,
          initial_message: settings.initial_message,
          suggested_messages: settings.suggested_messages,
          message_placeholder: settings.message_placeholder,
          show_feedback: settings.show_feedback,
          allow_regenerate: settings.allow_regenerate,
          theme: settings.theme,
          display_name: settings.display_name,
          profile_picture: settings.profile_picture,
          chat_icon: settings.chat_icon,
          bubble_position: settings.bubble_position,
          show_suggestions_after_chat: settings.show_suggestions_after_chat,
          auto_show_delay: settings.auto_show_delay,
          footer: settings.footer,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error saving chat settings:', error);
    return null;
  }
};

export const getChatSettings = async (agentId: string): Promise<ChatInterfaceSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('chat_interface_settings')
      .select()
      .eq('agent_id', agentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // If no settings exist yet, return null
    if (!data) return null;
    
    // Parse the suggested_messages JSON if it's a string
    const parsedData = {
      ...data,
      suggested_messages: typeof data.suggested_messages === 'string' 
        ? JSON.parse(data.suggested_messages)
        : (data.suggested_messages || []),
    };
    
    return parsedData;
  } catch (error) {
    console.error('Error fetching chat settings:', error);
    return null;
  }
};

export const uploadChatAsset = async (
  file: File,
  agentId: string,
  type: 'profile' | 'icon'
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `${agentId}/${type}_${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('chat_interface_assets')
      .upload(filePath, file);
      
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('chat_interface_assets')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};
