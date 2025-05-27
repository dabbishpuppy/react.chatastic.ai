
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { ChatInterfaceSettings, defaultChatSettings, SuggestedMessage } from '@/types/chatInterface';
import { getChatSettings, saveChatSettings, uploadChatAsset } from '@/services/chatSettingsService';
import { loadSettingsFromEdgeFunction } from './edgeFunctionService';
import { createTypedSettings, checkForChanges } from './types';
import { createSettingsFromEdgeData } from './settingsHelpers';
import { notifySettingsChange } from './notificationService';

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

  // Update draft settings whenever saved settings change
  useEffect(() => {
    setDraftSettings({...settings});
    setHasUnsavedChanges(false);
  }, [settings]);

  // Function to refresh settings from server
  const refreshSettings = async () => {
    if (!validAgentId) return;
    
    console.log('🔄 Refreshing settings for agent:', validAgentId);
    const edgeData = await loadSettingsFromEdgeFunction(validAgentId, true);
    
    if (edgeData && edgeData.visibility !== 'private') {
      console.log('✅ Refreshed settings from edge function:', edgeData);
      
      const newSettings = createSettingsFromEdgeData(edgeData, validAgentId);
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
          
          const newSettings = createSettingsFromEdgeData(edgeData, validAgentId);
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
      const hasChanges = checkForChanges(newDraftSettings, settings);
      setHasUnsavedChanges(hasChanges);
      return newDraftSettings;
    });
  };

  // Function to discard unsaved changes
  const discardChanges = () => {
    setDraftSettings({...settings});
    setHasUnsavedChanges(false);
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
          notifySettingsChange(typedSettings, validAgentId);
          
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
