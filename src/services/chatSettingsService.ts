
import { supabase } from "@/integrations/supabase/client";
import { ChatInterfaceSettings, SuggestedMessage } from "@/types/chatInterface";
import { Json } from "@/integrations/supabase/types";

// Helper function to parse suggested messages from JSON
const parseSuggestedMessages = (data: any): SuggestedMessage[] => {
  if (!data.suggested_messages) return [];
  
  try {
    if (typeof data.suggested_messages === 'string') {
      return JSON.parse(data.suggested_messages);
    } else if (Array.isArray(data.suggested_messages)) {
      // Make sure each item has id and text properties
      return data.suggested_messages.map((msg: any) => ({
        id: msg.id || `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        text: msg.text || (typeof msg === 'string' ? msg : '')
      }));
    }
    return [];
  } catch (error) {
    console.error('Error parsing suggested messages:', error);
    return [];
  }
};

// Helper function to ensure theme is one of the allowed values
const validateTheme = (theme: string): 'light' | 'dark' | 'system' => {
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }
  return 'light'; // Default to light if invalid
};

// Helper function to ensure bubble position is one of the allowed values
const validateBubblePosition = (position: string): 'left' | 'right' => {
  if (position === 'left' || position === 'right') {
    return position;
  }
  return 'right'; // Default to right if invalid
};

// Helper function to merge settings intelligently
const mergeSettings = (existingSettings: any, newSettings: ChatInterfaceSettings) => {
  console.log('🔄 Merging settings - Existing:', existingSettings);
  console.log('🔄 Merging settings - New:', newSettings);
  
  // Start with existing settings or defaults
  const merged = {
    initial_message: newSettings.initial_message ?? existingSettings?.initial_message ?? '👋 Hi! How can I help you today?',
    suggested_messages: JSON.stringify(newSettings.suggested_messages ?? parseSuggestedMessages(existingSettings) ?? []),
    message_placeholder: newSettings.message_placeholder ?? existingSettings?.message_placeholder ?? 'Write message here...',
    show_feedback: newSettings.show_feedback !== undefined ? newSettings.show_feedback : (existingSettings?.show_feedback ?? true),
    allow_regenerate: newSettings.allow_regenerate !== undefined ? newSettings.allow_regenerate : (existingSettings?.allow_regenerate ?? true),
    theme: validateTheme(newSettings.theme ?? existingSettings?.theme ?? 'light'),
    display_name: newSettings.display_name ?? existingSettings?.display_name ?? 'AI Assistant',
    profile_picture: newSettings.profile_picture !== undefined ? newSettings.profile_picture : existingSettings?.profile_picture,
    chat_icon: newSettings.chat_icon !== undefined ? newSettings.chat_icon : existingSettings?.chat_icon,
    bubble_position: validateBubblePosition(newSettings.bubble_position ?? existingSettings?.bubble_position ?? 'right'),
    show_suggestions_after_chat: newSettings.show_suggestions_after_chat !== undefined ? newSettings.show_suggestions_after_chat : (existingSettings?.show_suggestions_after_chat ?? true),
    auto_show_delay: newSettings.auto_show_delay !== undefined ? newSettings.auto_show_delay : (existingSettings?.auto_show_delay ?? 1),
    footer: newSettings.footer !== undefined ? newSettings.footer : existingSettings?.footer,
    user_message_color: newSettings.user_message_color !== undefined ? newSettings.user_message_color : (existingSettings?.user_message_color ?? '#3B82F6'),
    bubble_color: newSettings.bubble_color !== undefined ? newSettings.bubble_color : (existingSettings?.bubble_color ?? '#3B82F6'),
    sync_colors: newSettings.sync_colors !== undefined ? newSettings.sync_colors : (existingSettings?.sync_colors ?? false),
    primary_color: newSettings.primary_color !== undefined ? newSettings.primary_color : (existingSettings?.primary_color ?? '#3B82F6'),
    updated_at: new Date().toISOString(),
  };
  
  console.log('✅ Merged settings result:', merged);
  return merged;
};

export const saveChatSettings = async (settings: ChatInterfaceSettings): Promise<ChatInterfaceSettings | null> => {
  try {
    console.log('💾 Saving chat settings (with merge logic):', settings);
    
    // Only include agent_id if it exists and is valid
    const agentIdToUse = settings.agent_id && settings.agent_id !== "undefined" ? settings.agent_id : null;
    
    let existingSettings = null;
    
    if (settings.id) {
      // For updates, fetch existing settings first
      console.log('📖 Fetching existing settings for merge, ID:', settings.id);
      const { data: existing, error: fetchError } = await supabase
        .from("chat_interface_settings")
        .select('*')
        .eq('id', settings.id)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching existing settings:', fetchError);
      } else if (existing) {
        existingSettings = existing;
        console.log('📖 Found existing settings:', existingSettings);
      }
    } else if (agentIdToUse) {
      // For new settings with agent_id, check if settings already exist for this agent
      console.log('📖 Checking for existing settings for agent:', agentIdToUse);
      const { data: existing, error: fetchError } = await supabase
        .from("chat_interface_settings")
        .select('*')
        .eq('agent_id', agentIdToUse)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching existing settings for agent:', fetchError);
      } else if (existing) {
        existingSettings = existing;
        settings.id = existing.id; // Set the ID so we do an update instead of insert
        console.log('📖 Found existing settings for agent:', existingSettings);
      }
    }
    
    // Merge the settings intelligently
    const settingsData = mergeSettings(existingSettings, settings);
    
    // Add agent_id if available
    if (agentIdToUse) {
      Object.assign(settingsData, { agent_id: agentIdToUse });
    }

    if (settings.id) {
      // Update existing settings
      console.log('📝 Updating existing settings with ID:', settings.id);
      const { data, error } = await supabase
        .from("chat_interface_settings")
        .update(settingsData)
        .eq('id', settings.id)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error updating settings:', error);
        throw error;
      }
      
      console.log('✅ Settings updated successfully:', data);
      
      // Transform to expected type
      const result: ChatInterfaceSettings = {
        ...data,
        suggested_messages: parseSuggestedMessages(data),
        theme: validateTheme(data.theme),
        bubble_position: validateBubblePosition(data.bubble_position)
      };
      
      return result;
    } else {
      // Create new settings
      console.log('🆕 Creating new settings');
      const { data, error } = await supabase
        .from("chat_interface_settings")
        .insert(settingsData)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error creating settings:', error);
        throw error;
      }
      
      console.log('✅ Settings created successfully:', data);
      
      // Transform to expected type
      const result: ChatInterfaceSettings = {
        ...data,
        suggested_messages: parseSuggestedMessages(data),
        theme: validateTheme(data.theme),
        bubble_position: validateBubblePosition(data.bubble_position)
      };
      
      return result;
    }
  } catch (error) {
    console.error('❌ Error saving chat settings:', error);
    return null;
  }
};

export const getChatSettings = async (agentId: string): Promise<ChatInterfaceSettings | null> => {
  try {
    if (!agentId || agentId === "undefined") {
      console.error('Invalid agent ID for fetching chat settings');
      return null;
    }
    
    const { data, error } = await supabase
      .from("chat_interface_settings")
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching chat settings:', error);
      throw error;
    }
    
    // If no settings exist yet, return null
    if (!data) return null;
    
    // Parse the suggested_messages JSON and ensure theme is valid
    const parsedData: ChatInterfaceSettings = {
      ...data,
      suggested_messages: parseSuggestedMessages(data),
      theme: validateTheme(data.theme),
      bubble_position: validateBubblePosition(data.bubble_position)
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
    if (!agentId || agentId === "undefined") {
      console.error('Invalid agent ID for uploading chat asset');
      return null;
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}_${Date.now()}${fileExt ? `.${fileExt}` : ''}`;
    const filePath = `${agentId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('chat_interface_assets')
      .upload(filePath, file);
      
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }
    
    const { data } = supabase.storage
      .from('chat_interface_assets')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};
