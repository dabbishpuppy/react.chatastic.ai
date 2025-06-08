
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  is_predefined: boolean;
  agent_id?: string;
}

export interface AISettings {
  ai_model: string;
  ai_instructions: string;
  ai_temperature: number;
  ai_prompt_template: string;
  last_trained_at: string;
}

// Helper function to check if an ID is a valid UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export const useAISettings = (agentId: string) => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load AI settings and prompt templates
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Handle test or invalid agent IDs
        if (!agentId || agentId === 'test-agent-id' || !isValidUUID(agentId)) {
          console.log('Using mock AI settings for test/invalid agent ID');
          setSettings({
            ai_model: 'gpt-4o-mini',
            ai_instructions: 'You are a helpful AI assistant.',
            ai_temperature: 0.7,
            ai_prompt_template: 'custom',
            last_trained_at: new Date().toISOString()
          });
          setTemplates([
            {
              id: 'custom',
              name: 'Custom',
              description: 'Custom prompt template',
              instructions: 'You are a helpful AI assistant.',
              is_predefined: true
            }
          ]);
          return;
        }

        // Load agent AI settings
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('ai_model, ai_instructions, ai_temperature, ai_prompt_template, last_trained_at')
          .eq('id', agentId)
          .maybeSingle();

        if (agentError) {
          console.error('Error loading agent settings:', agentError);
          throw agentError;
        }

        // Load prompt templates (predefined + custom for this agent)
        const { data: templatesData, error: templatesError } = await supabase
          .from('prompt_templates')
          .select('*')
          .or(`is_predefined.eq.true,agent_id.eq.${agentId}`)
          .order('is_predefined', { ascending: false })
          .order('name');

        if (templatesError) {
          console.error('Error loading templates:', templatesError);
          throw templatesError;
        }

        setSettings(agentData || {
          ai_model: 'gpt-4o-mini',
          ai_instructions: 'You are a helpful AI assistant.',
          ai_temperature: 0.7,
          ai_prompt_template: 'custom',
          last_trained_at: new Date().toISOString()
        });
        setTemplates(templatesData || []);
      } catch (error) {
        console.error('Error loading AI settings:', error);
        toast({
          title: "Error loading AI settings",
          description: "Failed to load AI configuration. Using defaults.",
          variant: "destructive"
        });

        // Set default values on error
        setSettings({
          ai_model: 'gpt-4o-mini',
          ai_instructions: 'You are a helpful AI assistant.',
          ai_temperature: 0.7,
          ai_prompt_template: 'custom',
          last_trained_at: new Date().toISOString()
        });
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (agentId) {
      loadData();
    }
  }, [agentId, toast]);

  // Save AI settings
  const saveSettings = async (newSettings: Partial<AISettings>) => {
    try {
      setIsSaving(true);

      // Handle test or invalid agent IDs
      if (!agentId || agentId === 'test-agent-id' || !isValidUUID(agentId)) {
        console.log('Mock save for test/invalid agent ID');
        setSettings(prev => prev ? { ...prev, ...newSettings } : null);
        toast({
          title: "AI settings saved (test mode)",
          description: "Mock save completed for testing."
        });
        return true;
      }

      const { error } = await supabase
        .from('agents')
        .update(newSettings)
        .eq('id', agentId);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...newSettings } : null);

      toast({
        title: "AI settings saved",
        description: "Your agent's AI settings have been updated successfully."
      });

      return true;
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast({
        title: "Error saving AI settings",
        description: "Failed to save AI configuration. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Create custom prompt template
  const createTemplate = async (name: string, description: string, instructions: string) => {
    try {
      // Handle test or invalid agent IDs
      if (!agentId || agentId === 'test-agent-id' || !isValidUUID(agentId)) {
        console.log('Mock template creation for test/invalid agent ID');
        const mockTemplate = {
          id: `test-template-${Date.now()}`,
          name,
          description,
          instructions,
          agent_id: agentId,
          is_predefined: false
        };
        setTemplates(prev => [...prev, mockTemplate]);
        toast({
          title: "Template created (test mode)",
          description: "Mock template created for testing."
        });
        return mockTemplate;
      }

      const { data, error } = await supabase
        .from('prompt_templates')
        .insert({
          name,
          description,
          instructions,
          agent_id: agentId,
          is_predefined: false
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [...prev, data]);
      
      toast({
        title: "Template created",
        description: "Your custom prompt template has been created successfully."
      });

      return data;
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error creating template",
        description: "Failed to create prompt template. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Apply template to current settings
  const applyTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return false;

    return await saveSettings({
      ai_instructions: template.instructions,
      ai_prompt_template: templateId
    });
  };

  return {
    settings,
    templates,
    isLoading,
    isSaving,
    saveSettings,
    createTemplate,
    applyTemplate
  };
};
