import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { ChatInterfaceSettings, defaultChatSettings, SuggestedMessage } from '@/types/chatInterface';
import { getChatSettings, saveChatSettings, uploadChatAsset } from '@/services/chatSettingsService';

export const useChatSettings = () => {
  const { agentId } = useParams();
  const [settings, setSettings] = useState<ChatInterfaceSettings>({...defaultChatSettings});
  const [leadSettings, setLeadSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Check if agentId is valid (not undefined or the string "undefined")
  const validAgentId = agentId && agentId !== "undefined" ? agentId : null;

  const loadSettingsFromEdgeFunction = async (agentId: string, bustCache = false) => {
    try {
      console.log('📡 Loading settings from edge function for agent:', agentId);
      const timestamp = bustCache ? Date.now() : '';
      const response = await fetch(`https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings?agentId=${agentId}&_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZGZqbGt6dnhibm94ZnVib3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTM1MjQsImV4cCI6MjA2MzA2OTUyNH0.81qrGi1n9MpVIGNeJ8oPjyaUbuCKKKXfZXVuF90azFk`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZGZqbGt6dnhibm94ZnVib3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTM1MjQsImV4cCI6MjA2MzA2OTUyNH0.81qrGi1n9MpVIGNeJ8oPjyaUbuCKKKXfZXVuF90azFk',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Edge function response not ok:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('📡 Edge function response:', data);
      
      return data;
    } catch (error) {
      console.error('Error loading settings from edge function:', error);
      return null;
    }
  };

  // Helper function to ensure suggested_messages is always an array
  const ensureSuggestedMessagesArray = (messages: any): SuggestedMessage[] => {
    if (!messages) return [];
    
    if (Array.isArray(messages)) {
      return messages.map((msg, index) => ({
        id: msg.id || `msg-${index}`,
        text: msg.text || (typeof msg === 'string' ? msg : '')
      }));
    }
    
    if (typeof messages === 'string') {
      try {
        const parsed = JSON.parse(messages);
        if (Array.isArray(parsed)) {
          return parsed.map((msg, index) => ({
            id: msg.id || `msg-${index}`,
            text: msg.text || (typeof msg === 'string' ? msg : '')
          }));
        }
      } catch (error) {
        console.error('Error parsing suggested_messages string:', error);
      }
    }
    
    return [];
  };

  // Function to refresh settings from server
  const refreshSettings = async () => {
    if (!validAgentId) return;
    
    console.log('🔄 Refreshing settings for agent:', validAgentId);
    const edgeData = await loadSettingsFromEdgeFunction(validAgentId, true);
    
    if (edgeData && edgeData.visibility !== 'private') {
      console.log('✅ Refreshed settings from edge function:', edgeData);
      
      setSettings({
        ...defaultChatSettings,
        agent_id: validAgentId,
        display_name: edgeData.display_name,
        initial_message: edgeData.initial_message,
        message_placeholder: edgeData.message_placeholder,
        theme: edgeData.theme,
        profile_picture: edgeData.profile_picture,
        chat_icon: edgeData.chat_icon,
        bubble_position: edgeData.bubble_position,
        footer: edgeData.footer,
        user_message_color: edgeData.user_message_color,
        bubble_color: edgeData.bubble_color,
        sync_colors: edgeData.sync_colors,
        primary_color: edgeData.primary_color,
        show_feedback: edgeData.show_feedback,
        allow_regenerate: edgeData.allow_regenerate,
        suggested_messages: ensureSuggestedMessagesArray(edgeData.suggested_messages),
        show_suggestions_after_chat: edgeData.show_suggestions_after_chat,
        auto_show_delay: edgeData.auto_show_delay
      });

      if (edgeData.lead_settings) {
        console.log('📋 Refreshed lead settings:', edgeData.lead_settings);
        setLeadSettings(edgeData.lead_settings);
      }
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      
      if (validAgentId) {
        // For embedded mode, try edge function first
        const edgeData = await loadSettingsFromEdgeFunction(validAgentId);
        
        if (edgeData && edgeData.visibility !== 'private') {
          console.log('✅ Using edge function data:', edgeData);
          
          // Set chat settings with proper suggested_messages handling
          setSettings({
            ...defaultChatSettings,
            agent_id: validAgentId,
            display_name: edgeData.display_name,
            initial_message: edgeData.initial_message,
            message_placeholder: edgeData.message_placeholder,
            theme: edgeData.theme,
            profile_picture: edgeData.profile_picture,
            chat_icon: edgeData.chat_icon,
            bubble_position: edgeData.bubble_position,
            footer: edgeData.footer,
            user_message_color: edgeData.user_message_color,
            bubble_color: edgeData.bubble_color,
            sync_colors: edgeData.sync_colors,
            primary_color: edgeData.primary_color,
            show_feedback: edgeData.show_feedback,
            allow_regenerate: edgeData.allow_regenerate,
            suggested_messages: ensureSuggestedMessagesArray(edgeData.suggested_messages),
            show_suggestions_after_chat: edgeData.show_suggestions_after_chat,
            auto_show_delay: edgeData.auto_show_delay
          });

          // Set lead settings from edge function
          if (edgeData.lead_settings) {
            console.log('📋 Setting lead settings from edge function:', edgeData.lead_settings);
            setLeadSettings(edgeData.lead_settings);
          }
        } else {
          // Fallback to direct database call
          const data = await getChatSettings(validAgentId);
          
          if (data) {
            setSettings({
              ...defaultChatSettings,
              ...data,
              suggested_messages: ensureSuggestedMessagesArray(data.suggested_messages),
              sync_colors: data.sync_colors !== undefined ? data.sync_colors : false,
              primary_color: data.primary_color || '#3B82F6'
            });
          } else {
            setSettings({
              ...defaultChatSettings,
              agent_id: validAgentId
            });
          }
        }
      } else {
        // No valid agent ID, just use default settings with no agent_id
        setSettings({
          ...defaultChatSettings
        });
      }
      
      setIsLoading(false);
    };

    loadSettings();
  }, [validAgentId]);

  const updateSetting = <K extends keyof ChatInterfaceSettings>(
    key: K, 
    value: ChatInterfaceSettings[K]
  ) => {
    console.log(`🔧 Updating setting ${String(key)}:`, value);
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      console.log('🔧 New settings state:', newSettings);
      return newSettings;
    });
  };

  // Function to notify embedded components about settings changes
  const notifySettingsChange = (settingsToNotify: ChatInterfaceSettings) => {
    console.log('📢 Notifying settings change to embedded components');
    
    // Send message to all iframes on the page
    const iframes = document.querySelectorAll('iframe[src*="/embed/"]');
    iframes.forEach(iframe => {
      if (iframe.contentWindow) {
        console.log('📤 Sending settings update to iframe');
        iframe.contentWindow.postMessage({
          type: 'wonderwave-refresh-settings',
          agentId: validAgentId,
          settings: settingsToNotify
        }, '*');
      }
    });

    // Send message to parent window (in case this settings page is embedded)
    if (window.parent !== window) {
      console.log('📤 Sending settings update to parent window');
      window.parent.postMessage({
        type: 'wonderwave-refresh-settings',
        agentId: validAgentId,
        settings: settingsToNotify
      }, '*');
    }

    // Send message to any wonderwave widgets on external sites
    if (window.opener) {
      console.log('📤 Sending settings update to opener window');
      window.opener.postMessage({
        type: 'wonderwave-refresh-settings',
        agentId: validAgentId,
        settings: settingsToNotify
      }, '*');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    console.log('💾 Saving settings:', settings);
    
    try {
      const updatedSettings = await saveChatSettings({
        ...settings,
        // Only include agent_id if we have a valid one
        ...(validAgentId && { agent_id: validAgentId })
      });
      
      if (updatedSettings) {
        console.log('✅ Settings saved successfully:', updatedSettings);
        setSettings(updatedSettings);
        
        // Notify embedded components about the change
        notifySettingsChange(updatedSettings);
        
        // Small delay to ensure the message is sent before showing success
        setTimeout(() => {
          toast({
            title: "Settings saved",
            description: "Your chat interface settings have been updated successfully."
          });
        }, 100);
      } else {
        console.error('❌ Failed to save settings - no data returned');
        toast({
          title: "Error",
          description: "Failed to save settings. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addSuggestedMessage = (text: string) => {
    const newMessage: SuggestedMessage = { 
      id: Date.now().toString(), 
      text 
    };
    
    updateSetting('suggested_messages', [
      ...settings.suggested_messages,
      newMessage
    ]);
  };

  const updateSuggestedMessage = (id: string, text: string) => {
    updateSetting('suggested_messages', 
      settings.suggested_messages.map(msg => 
        msg.id === id ? { ...msg, text } : msg
      )
    );
  };

  const deleteSuggestedMessage = (id: string) => {
    updateSetting('suggested_messages', 
      settings.suggested_messages.filter(msg => msg.id !== id)
    );
  };

  const uploadImage = async (file: File, type: 'profile' | 'icon') => {
    if (!validAgentId) {
      // Create a temporary URL for preview without storing in Supabase
      const tempUrl = URL.createObjectURL(file);
      
      if (type === 'profile') {
        updateSetting('profile_picture', tempUrl);
      } else {
        updateSetting('chat_icon', tempUrl);
      }
      
      toast({
        title: "Preview Only",
        description: "Image will not be permanently saved until you associate with an agent ID.",
      });
      
      return tempUrl;
    }
    
    setIsUploading(true);
    try {
      const url = await uploadChatAsset(file, validAgentId, type);
      
      if (url) {
        if (type === 'profile') {
          updateSetting('profile_picture', url);
        } else {
          updateSetting('chat_icon', url);
        }
        return url;
      } else {
        toast({
          title: "Upload Failed",
          description: "Failed to upload image. Please try again.",
          variant: "destructive"
        });
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during upload.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    settings,
    leadSettings,
    isLoading,
    isSaving,
    isUploading,
    updateSetting,
    handleSave,
    addSuggestedMessage,
    updateSuggestedMessage,
    deleteSuggestedMessage,
    uploadImage,
    refreshSettings
  };
};
