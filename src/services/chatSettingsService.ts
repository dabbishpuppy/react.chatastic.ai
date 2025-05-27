
import { supabase } from '@/integrations/supabase/client';
import { ChatInterfaceSettings } from '@/types/chatInterface';

export const getChatSettings = async (agentId: string) => {
  try {
    console.log('🔍 Fetching chat settings for agent:', agentId);
    
    const { data, error } = await supabase
      .from('chat_interface_settings')
      .select('*')
      .eq('agent_id', agentId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching chat settings:', error);
      return null;
    }

    console.log('✅ Chat settings fetched:', data);
    return data;
  } catch (error) {
    console.error('❌ Unexpected error fetching chat settings:', error);
    return null;
  }
};

export const saveChatSettings = async (settings: ChatInterfaceSettings) => {
  try {
    console.log('💾 Saving chat settings:', settings);

    // Convert suggested_messages array to JSON string for storage
    const settingsToSave = {
      ...settings,
      suggested_messages: JSON.stringify(settings.suggested_messages || []),
      // Explicitly set null values for removed images
      profile_picture: settings.profile_picture || null,
      chat_icon: settings.chat_icon || null
    };

    // Try to update first (if record exists)
    if (settings.agent_id) {
      const { data: updateData, error: updateError } = await supabase
        .from('chat_interface_settings')
        .update(settingsToSave)
        .eq('agent_id', settings.agent_id)
        .select()
        .maybeSingle();

      if (updateError) {
        console.log('Update failed, attempting insert:', updateError.message);
      } else if (updateData) {
        console.log('✅ Settings updated successfully:', updateData);
        return {
          ...updateData,
          suggested_messages: JSON.parse(updateData.suggested_messages || '[]')
        };
      }
    }

    // If update failed or no agent_id, try insert
    const { data: insertData, error: insertError } = await supabase
      .from('chat_interface_settings')
      .insert(settingsToSave)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting chat settings:', insertError);
      return null;
    }

    console.log('✅ Settings inserted successfully:', insertData);
    return {
      ...insertData,
      suggested_messages: JSON.parse(insertData.suggested_messages || '[]')
    };
  } catch (error) {
    console.error('❌ Unexpected error saving chat settings:', error);
    return null;
  }
};

export const uploadChatAsset = async (file: File, agentId: string, type: 'profile' | 'icon') => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}_${Date.now()}.${fileExt}`;
    const filePath = `${agentId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('chat_interface_assets')
      .upload(filePath, file);

    if (error) {
      console.error('❌ Error uploading file:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat_interface_assets')
      .getPublicUrl(filePath);

    console.log('✅ File uploaded successfully:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('❌ Unexpected error uploading file:', error);
    return null;
  }
};
