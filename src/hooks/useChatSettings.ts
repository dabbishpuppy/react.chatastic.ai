
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { ChatInterfaceSettings, defaultChatSettings, SuggestedMessage } from '@/types/chatInterface';
import { getChatSettings, saveChatSettings, uploadChatAsset } from '@/services/chatSettingsService';

export const useChatSettings = () => {
  const { agentId } = useParams();
  const [settings, setSettings] = useState<ChatInterfaceSettings>({...defaultChatSettings});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Check if agentId is valid (not undefined or the string "undefined")
  const validAgentId = agentId && agentId !== "undefined" ? agentId : null;

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      
      if (validAgentId) {
        // Try to load settings if we have a valid agent ID
        const data = await getChatSettings(validAgentId);
        
        if (data) {
          setSettings(data);
        } else {
          setSettings({
            ...defaultChatSettings,
            agent_id: validAgentId
          });
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
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedSettings = await saveChatSettings({
        ...settings,
        // Only include agent_id if we have a valid one
        ...(validAgentId && { agent_id: validAgentId })
      });
      
      if (updatedSettings) {
        setSettings(updatedSettings);
        toast({
          title: "Settings saved",
          description: "Your chat interface settings have been updated successfully."
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save settings. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
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
    isLoading,
    isSaving,
    isUploading,
    updateSetting,
    handleSave,
    addSuggestedMessage,
    updateSuggestedMessage,
    deleteSuggestedMessage,
    uploadImage
  };
};
