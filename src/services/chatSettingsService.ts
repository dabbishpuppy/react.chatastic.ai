
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
  return 'light';
};

// Helper function to ensure bubble position is one of the allowed values
const validateBubblePosition = (position: string): 'left' | 'right' => {
  if (position === 'left' || position === 'right') {
    return position;
  }
  return 'right';
};

// Helper function to sanitize data for database insertion
const sanitizeSettingsData = (settings: ChatInterfaceSettings) => {
  const sanitized = {
    initial_message: settings.initial_message || '👋 Hi! How can I help you today?',
    suggested_messages: JSON.stringify(settings.suggested_messages || []),
    message_placeholder: settings.message_placeholder || 'Write message here...',
    show_feedback: settings.show_feedback !== undefined ? settings.show_feedback : true,
    allow_regenerate: settings.allow_regenerate !== undefined ? settings.allow_regenerate : true,
    theme: validateTheme(settings.theme || 'light'),
    display_name: settings.display_name || 'AI Assistant',
    profile_picture: settings.profile_picture || null,
    chat_icon: settings.chat_icon || null,
    bubble_position: validateBubblePosition(settings.bubble_position || 'right'),
    show_suggestions_after_chat: settings.show_suggestions_after_chat !== undefined ? settings.show_suggestions_after_chat : true,
    auto_show_delay: settings.auto_show_delay !== undefined ? settings.auto_show_delay : 1,
    footer: settings.footer || null,
    user_message_color: settings.user_message_color || null,
    bubble_color: settings.bubble_color || null,
    sync_colors: settings.sync_colors !== undefined ? settings.sync_colors : false,
    primary_color: settings.primary_color || null,
    updated_at: new Date().toISOString(),
  };
  
  console.log('🧹 Sanitized settings data:', sanitized);
  return sanitized;
};

// Helper function to merge settings intelligently
const mergeSettings = (existingSettings: any, newSettings: ChatInterfaceSettings) => {
  console.log('🔄 Merging settings - Existing:', existingSettings);
  console.log('🔄 Merging settings - New:', newSettings);
  
  // Start with sanitized new settings
  const merged = sanitizeSettingsData(newSettings);
  
  // Merge with existing settings where new values are undefined/null
  if (existingSettings) {
    Object.keys(merged).forEach(key => {
      if (merged[key] === null || merged[key] === undefined) {
        merged[key] = existingSettings[key];
      }
    });
  }
  
  console.log('✅ Merged settings result:', merged);
  return merged;
};

export const saveChatSettings = async (settings: ChatInterfaceSettings): Promise<ChatInterfaceSettings | null> => {
  try {
    console.log('💾 Saving chat settings:', settings);
    
    if (!settings) {
      console.error('❌ No settings provided');
      return null;
    }
    
    const agentIdToUse = settings.agent_id && settings.agent_id !== "undefined" ? settings.agent_id : null;
    
    let existingSettings = null;
    
    if (settings.id) {
      console.log('📖 Fetching existing settings for merge, ID:', settings.id);
      const { data: existing, error: fetchError } = await supabase
        .from("chat_interface_settings")
        .select('*')
        .eq('id', settings.id)
        .maybeSingle();
        
      if (fetchError) {
        console.error('❌ Error fetching existing settings:', fetchError);
      } else if (existing) {
        existingSettings = existing;
        console.log('📖 Found existing settings:', existingSettings);
      }
    } else if (agentIdToUse) {
      console.log('📖 Checking for existing settings for agent:', agentIdToUse);
      const { data: existing, error: fetchError } = await supabase
        .from("chat_interface_settings")
        .select('*')
        .eq('agent_id', agentIdToUse)
        .maybeSingle();
        
      if (fetchError) {
        console.error('❌ Error fetching existing settings for agent:', fetchError);
      } else if (existing) {
        existingSettings = existing;
        settings.id = existing.id;
        console.log('📖 Found existing settings for agent:', existingSettings);
      }
    }
    
    const settingsData = mergeSettings(existingSettings, settings);
    
    if (agentIdToUse) {
      Object.assign(settingsData, { agent_id: agentIdToUse });
    }

    if (settings.id) {
      console.log('📝 Updating existing settings with ID:', settings.id);
      const { data, error } = await supabase
        .from("chat_interface_settings")
        .update(settingsData)
        .eq('id', settings.id)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error updating settings:', error);
        console.error('❌ Settings data that failed:', settingsData);
        throw error;
      }
      
      console.log('✅ Settings updated successfully:', data);
      
      const result: ChatInterfaceSettings = {
        ...data,
        suggested_messages: parseSuggestedMessages(data),
        theme: validateTheme(data.theme),
        bubble_position: validateBubblePosition(data.bubble_position)
      };
      
      return result;
    } else {
      console.log('🆕 Creating new settings');
      const { data, error } = await supabase
        .from("chat_interface_settings")
        .insert(settingsData)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error creating settings:', error);
        console.error('❌ Settings data that failed:', settingsData);
        throw error;
      }
      
      console.log('✅ Settings created successfully:', data);
      
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
      .maybeSingle();

    if (error) {
      console.error('Error fetching chat settings:', error);
      throw error;
    }
    
    if (!data) return null;
    
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
    
    console.log('📤 Uploading file:', { fileName, filePath, fileSize: file.size });
    
    const { error: uploadError } = await supabase.storage
      .from('chat_interface_assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }
    
    const { data } = supabase.storage
      .from('chat_interface_assets')
      .getPublicUrl(filePath);
      
    console.log('✅ File uploaded successfully:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};
