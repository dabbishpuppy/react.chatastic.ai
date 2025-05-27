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

export const saveChatSettings = async (settings: ChatInterfaceSettings): Promise<ChatInterfaceSettings | null> => {
  try {
    console.log('💾 Saving chat settings to database:', settings);
    
    // Validate the settings before saving
    if (!settings.theme) {
      console.warn('⚠️ No theme specified, defaulting to light');
      settings.theme = 'light';
    }
    
    if (!settings.suggested_messages) {
      console.warn('⚠️ No suggested messages, defaulting to empty array');
      settings.suggested_messages = [];
    }
    
    // If no agent_id is provided, create/update settings without associating with an agent
    const settingsData = {
      initial_message: settings.initial_message || '👋 Hi! How can I help you today?',
      suggested_messages: JSON.stringify(settings.suggested_messages),
      message_placeholder: settings.message_placeholder || 'Write message here...',
      show_feedback: settings.show_feedback ?? true,
      allow_regenerate: settings.allow_regenerate ?? true,
      theme: validateTheme(settings.theme),
      display_name: settings.display_name || 'AI Assistant',
      profile_picture: settings.profile_picture,
      chat_icon: settings.chat_icon,
      bubble_position: validateBubblePosition(settings.bubble_position || 'right'),
      show_suggestions_after_chat: settings.show_suggestions_after_chat ?? true,
      auto_show_delay: settings.auto_show_delay ?? 1,
      footer: settings.footer,
      user_message_color: settings.user_message_color || '#3B82F6',
      bubble_color: settings.bubble_color || '#3B82F6',
      sync_colors: settings.sync_colors ?? false,
      primary_color: settings.primary_color || '#3B82F6',
      updated_at: new Date().toISOString(),
    };
    
    console.log('💾 Prepared settings data for save:', settingsData);
    
    // Only include agent_id if it exists and is valid
    if (settings.agent_id && settings.agent_id !== "undefined") {
      Object.assign(settingsData, { agent_id: settings.agent_id });
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
