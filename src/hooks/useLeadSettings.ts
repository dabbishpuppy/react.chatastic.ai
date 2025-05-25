
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface LeadSettings {
  id?: string;
  agent_id: string;
  enabled: boolean;
  title: string;
  collect_name: boolean;
  name_placeholder: string;
  collect_email: boolean;
  email_placeholder: string;
  collect_phone: boolean;
  phone_placeholder: string;
}

export const useLeadSettings = (agentId: string) => {
  const [settings, setSettings] = useState<LeadSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    if (!agentId) return;

    try {
      const { data, error } = await supabase
        .from('lead_settings')
        .select('*')
        .eq('agent_id', agentId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching lead settings:', error);
        return;
      }

      if (data) {
        setSettings(data);
      } else {
        // Create default settings
        const defaultSettings: Omit<LeadSettings, 'id'> = {
          agent_id: agentId,
          enabled: false,
          title: 'Get in touch with us',
          collect_name: true,
          name_placeholder: 'Full name',
          collect_email: true,
          email_placeholder: 'Email',
          collect_phone: false,
          phone_placeholder: 'Phone'
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching lead settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (updatedSettings: Partial<LeadSettings>) => {
    if (!agentId) return false;

    setIsSaving(true);
    
    try {
      const settingsToSave = {
        ...settings,
        ...updatedSettings,
        agent_id: agentId
      };

      const { data, error } = await supabase
        .from('lead_settings')
        .upsert([settingsToSave], { onConflict: 'agent_id' })
        .select()
        .single();

      if (error) {
        console.error('Error saving lead settings:', error);
        toast({
          title: "Error saving settings",
          description: "Please try again.",
          variant: "destructive"
        });
        return false;
      }

      setSettings(data);
      toast({
        title: "Lead settings saved",
        description: "Your lead collection settings have been updated successfully."
      });
      return true;
    } catch (error) {
      console.error('Error saving lead settings:', error);
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
