import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { ChatInterfaceSettings, defaultChatSettings, SuggestedMessage } from '@/types/chatInterface';
import { getChatSettings, saveChatSettings, uploadChatAsset } from '@/services/chatSettingsService';

export const useChatSettings = () => {
  const { agentId } = useParams();
  const [settings, setSettings] = useState<ChatInterfaceSettings>({...defaultChatSettings});
  const [draftSettings, setDraftSettings] = useState<ChatInterfaceSettings>({...defaultChatSettings});
  const [leadSettings, setLeadSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Check if agentId is valid (not undefined or the string "undefined")
  const validAgentId = agentId && agentId !== "undefined" ? agentId : null;

  // Helper function to check if settings have changed
  const checkForChanges = (draft: ChatInterfaceSettings, saved: ChatInterfaceSettings) => {
    const hasChanges = JSON.stringify(draft) !== JSON.stringify(saved);
    setHasUnsavedChanges(hasChanges);
    return hasChanges;
  };

  // Update draft settings whenever saved settings change
  useEffect(() => {
    setDraftSettings({...settings});
    setHasUnsavedChanges(false);
  }, [settings]);

  const loadSettingsFromEdgeFunction = async (agentId: string, bustCache = false) => {
    try {
      console.log('📡 Loading settings from edge function for agent:', agentId);
      const timestamp = bustCache ? `&_t=${Date.now()}` : '';
      const response = await fetch(`https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings?agentId=${agentId}${timestamp}`, {
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

  // Helper function to ensure theme is properly typed
  const ensureValidTheme = (theme: any): 'light' | 'dark' | 'system' => {
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
    return 'light'; // default fallback
  };

  // Helper function to ensure bubble_position is properly typed
  const ensureValidBubblePosition = (position: any): 'left' | 'right' => {
    if (position === 'left' || position === 'right') {
      return position;
    }
    return 'right'; // default fallback
  };

  // Helper function to create properly typed ChatInterfaceSettings
  const createTypedSettings = (data: any, agentId?: string): ChatInterfaceSettings => {
    return {
      ...defaultChatSettings,
      ...data,
      agent_id: agentId || data.agent_id,
      theme: ensureValidTheme(data.theme),
      bubble_position: ensureValidBubblePosition(data.bubble_position),
      suggested_messages: ensureSuggestedMessagesArray(data.suggested_messages),
      sync_colors: data.sync_colors !== undefined ? data.sync_colors : false,
      primary_color: data.primary_color || defaultChatSettings.primary_color || '#3B82F6',
      profile_picture: data.profile_picture || null,
      chat_icon: data.chat_icon || null
    };
  };

  // Function to refresh settings from server
  const refreshSettings = async () => {
    if (!validAgentId) return;
    
    console.log('🔄 Refreshing settings for agent:', validAgentId);
    const edgeData = await loadSettingsFromEdgeFunction(validAgentId, true);
    
    if (edgeData && edgeData.visibility !== 'private') {
      console.log('✅ Refreshed settings from edge function:', edgeData);
      
      const newSettings = createTypedSettings({
        display_name: edgeData.display_name || defaultChatSettings.display_name,
        initial_message: edgeData.initial_message || defaultChatSettings.initial_message,
        message_placeholder: edgeData.message_placeholder || defaultChatSettings.message_placeholder,
        theme: edgeData.theme,
        profile_picture: edgeData.profile_picture || null,
        chat_icon: edgeData.chat_icon || null,
        bubble_position: edgeData.bubble_position,
        footer: edgeData.footer || null,
        user_message_color: edgeData.user_message_color || null,
        bubble_color: edgeData.bubble_color || null,
        sync_colors: edgeData.sync_colors || false,
        primary_color: edgeData.primary_color || null,
        show_feedback: edgeData.show_feedback !== undefined ? edgeData.show_feedback : defaultChatSettings.show_feedback,
        allow_regenerate: edgeData.allow_regenerate !== undefined ? edgeData.allow_regenerate : defaultChatSettings.allow_regenerate,
        suggested_messages: edgeData.suggested_messages,
        show_suggestions_after_chat: edgeData.show_suggestions_after_chat !== undefined ? edgeData.show_suggestions_after_chat : defaultChatSettings.show_suggestions_after_chat,
        auto_show_delay: edgeData.auto_show_delay !== undefined ? edgeData.auto_show_delay : defaultChatSettings.auto_show_delay
      }, validAgentId);

      setSettings(newSettings);

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
          const newSettings = createTypedSettings({
            display_name: edgeData.display_name || defaultChatSettings.display_name,
            initial_message: edgeData.initial_message || defaultChatSettings.initial_message,
            message_placeholder: edgeData.message_placeholder || defaultChatSettings.message_placeholder,
            theme: edgeData.theme,
            profile_picture: edgeData.profile_picture || null,
            chat_icon: edgeData.chat_icon || null,
            bubble_position: edgeData.bubble_position,
            footer: edgeData.footer || null,
            user_message_color: edgeData.user_message_color || null,
            bubble_color: edgeData.bubble_color || null,
            sync_colors: edgeData.sync_colors || false,
            primary_color: edgeData.primary_color || null,
            show_feedback: edgeData.show_feedback !== undefined ? edgeData.show_feedback : defaultChatSettings.show_feedback,
            allow_regenerate: edgeData.allow_regenerate !== undefined ? edgeData.allow_regenerate : defaultChatSettings.allow_regenerate,
            suggested_messages: edgeData.suggested_messages,
            show_suggestions_after_chat: edgeData.show_suggestions_after_chat !== undefined ? edgeData.show_suggestions_after_chat : defaultChatSettings.show_suggestions_after_chat,
            auto_show_delay: edgeData.auto_show_delay !== undefined ? edgeData.auto_show_delay : defaultChatSettings.auto_show_delay
          }, validAgentId);

          setSettings(newSettings);

          // Set lead settings from edge function
          if (edgeData.lead_settings) {
            console.log('📋 Setting lead settings from edge function:', edgeData.lead_settings);
            setLeadSettings(edgeData.lead_settings);
          }
        } else {
          // Fallback to direct database call
          const data = await getChatSettings(validAgentId);
          
          if (data) {
            const newSettings = createTypedSettings(data);
            setSettings(newSettings);
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

  const updateDraftSetting = <K extends keyof ChatInterfaceSettings>(
    key: K, 
    value: ChatInterfaceSettings[K]
  ) => {
    console.log(`🔧 Updating draft setting ${String(key)}:`, value);
    setDraftSettings(prev => {
      const newDraftSettings = { ...prev, [key]: value };
      console.log('🔧 New draft settings state:', newDraftSettings);
      checkForChanges(newDraftSettings, settings);
      return newDraftSettings;
    });
  };

  // Function to discard unsaved changes
  const discardChanges = () => {
    setDraftSettings({...settings});
    setHasUnsavedChanges(false);
  };

  // Function to notify embedded components about settings changes
  const notifySettingsChange = (settingsToNotify: ChatInterfaceSettings) => {
    console.log('📢 Notifying settings change to embedded components');
    
    // Create the message payload
    const messagePayload = {
      type: 'wonderwave-refresh-settings',
      agentId: validAgentId,
      settings: settingsToNotify
    };
    
    console.log('📤 Message payload:', messagePayload);
    
    // Send message to all iframes on the page
    const iframes = document.querySelectorAll('iframe[src*="/embed/"]');
    console.log(`📤 Found ${iframes.length} iframes to notify`);
    iframes.forEach((iframe, index) => {
      const iframeElement = iframe as HTMLIFrameElement;
      if (iframeElement.contentWindow) {
        console.log(`📤 Sending settings update to iframe ${index + 1}`);
        try {
          iframeElement.contentWindow.postMessage(messagePayload, '*');
          console.log(`✅ Message sent to iframe ${index + 1}`);
        } catch (error) {
          console.error(`❌ Failed to send message to iframe ${index + 1}:`, error);
        }
      }
    });

    // Send message to parent window (in case this settings page is embedded)
    if (window.parent !== window) {
      console.log('📤 Sending settings update to parent window');
      try {
        window.parent.postMessage(messagePayload, '*');
        console.log('✅ Message sent to parent window');
      } catch (error) {
        console.error('❌ Failed to send message to parent window:', error);
      }
    }

    // Send message to any wonderwave widgets on external sites
    if (window.opener) {
      console.log('📤 Sending settings update to opener window');
      try {
        window.opener.postMessage(messagePayload, '*');
        console.log('✅ Message sent to opener window');
      } catch (error) {
        console.error('❌ Failed to send message to opener window:', error);
      }
    }
    
    // Also trigger a refresh of the edge function to update cache
    if (validAgentId) {
      console.log('🔄 Triggering edge function cache refresh');
      loadSettingsFromEdgeFunction(validAgentId, true).then(() => {
        console.log('✅ Edge function cache refreshed');
      }).catch(error => {
        console.error('❌ Failed to refresh edge function cache:', error);
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    console.log('💾 Saving draft settings:', draftSettings);
    
    try {
      // Prepare settings to save - ensure null values are preserved
      const settingsToSave = {
        ...draftSettings,
        // Explicitly handle null values for removed images
        profile_picture: draftSettings.profile_picture === null ? null : draftSettings.profile_picture,
        chat_icon: draftSettings.chat_icon === null ? null : draftSettings.chat_icon,
        // Only include agent_id if we have a valid one
        ...(validAgentId && { agent_id: validAgentId })
      };
      
      const updatedSettings = await saveChatSettings(settingsToSave);
      
      if (updatedSettings) {
        console.log('✅ Settings saved successfully:', updatedSettings);
        // Use the helper function to ensure proper typing
        const typedSettings = createTypedSettings(updatedSettings);
        setSettings(typedSettings);
        setHasUnsavedChanges(false);
        
        // Small delay to ensure database is updated before notifying
        setTimeout(() => {
          // Notify embedded components about the change with the updated settings
          notifySettingsChange(typedSettings);
          
          toast({
            title: "Settings saved",
            description: "Your chat interface settings have been updated successfully."
          });
        }, 500);
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
    
    updateDraftSetting('suggested_messages', [
      ...draftSettings.suggested_messages,
      newMessage
    ]);
  };

  const updateSuggestedMessage = (id: string, text: string) => {
    updateDraftSetting('suggested_messages', 
      draftSettings.suggested_messages.map(msg => 
        msg.id === id ? { ...msg, text } : msg
      )
    );
  };

  const deleteSuggestedMessage = (id: string) => {
    updateDraftSetting('suggested_messages', 
      draftSettings.suggested_messages.filter(msg => msg.id !== id)
    );
  };

  const uploadImage = async (file: File, type: 'profile' | 'icon') => {
    if (!validAgentId) {
      // Create a temporary URL for preview without storing in Supabase
      const tempUrl = URL.createObjectURL(file);
      
      if (type === 'profile') {
        updateDraftSetting('profile_picture', tempUrl);
      } else {
        updateDraftSetting('chat_icon', tempUrl);
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
          updateDraftSetting('profile_picture', url);
        } else {
          updateDraftSetting('chat_icon', url);
        }
        
        toast({
          title: "Upload Successful",
          description: "Image uploaded successfully. Don't forget to save your settings.",
        });
        
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
    settings, // Published/saved settings (for embedded widgets)
    draftSettings, // Draft settings (for form inputs and preview)
    leadSettings,
    isLoading,
    isSaving,
    isUploading,
    hasUnsavedChanges,
    updateSetting: updateDraftSetting, // Update draft instead of published
    handleSave,
    discardChanges,
    addSuggestedMessage,
    updateSuggestedMessage,
    deleteSuggestedMessage,
    uploadImage,
    refreshSettings
  };
};
