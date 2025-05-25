
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface NotificationSettings {
  id?: string;
  agent_id: string;
  daily_leads_enabled: boolean;
  daily_conversations_enabled: boolean;
  leads_emails: string[];
  conversations_emails: string[];
}

export const useNotificationSettings = (agentId: string) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    if (!agentId) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification settings:', error);
        return;
      }

      if (data) {
        setSettings(data);
      } else {
        // Create default settings
        const defaultSettings: Omit<NotificationSettings, 'id'> = {
          agent_id: agentId,
          daily_leads_enabled: false,
          daily_conversations_enabled: false,
          leads_emails: [],
          conversations_emails: []
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (updatedSettings: Partial<NotificationSettings>) => {
    if (!agentId) return false;

    setIsSaving(true);
    
    try {
      const settingsToSave = {
        ...settings,
        ...updatedSettings,
        agent_id: agentId
      };

      const { data, error } = await supabase
        .from('notification_settings')
        .upsert([settingsToSave], { onConflict: 'agent_id' })
        .select()
        .single();

      if (error) {
        console.error('Error saving notification settings:', error);
        toast({
          title: "Error saving settings",
          description: "Please try again.",
          variant: "destructive"
        });
        return false;
      }

      setSettings(data);
      toast({
        title: "Notification settings saved",
        description: "Your notification settings have been updated successfully."
      });
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error saving settings",
        description: "Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [agentId]);

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
    refreshSettings: fetchSettings
  };
};
