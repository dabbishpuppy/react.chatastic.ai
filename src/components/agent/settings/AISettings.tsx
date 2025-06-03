
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { useAISettings } from "@/hooks/useAISettings";
import { Loader2 } from "lucide-react";
import { ModelSelector } from "./ai/ModelSelector";
import { TemplateSelector } from "./ai/TemplateSelector";
import { InstructionsEditor } from "./ai/InstructionsEditor";
import { TemperatureSlider } from "./ai/TemperatureSlider";
import { TrainingStatus } from "./ai/TrainingStatus";
import { TemplateCreationDialog } from "./ai/TemplateCreationDialog";

const AISettings: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { settings, templates, isLoading, isSaving, saveSettings, createTemplate } = useAISettings(agentId!);
  const { toast } = useToast();

  // Local state for form
  const [model, setModel] = useState(settings?.ai_model || "gpt-4o-mini");
  const [instructions, setInstructions] = useState(settings?.ai_instructions || "");
  const [temperature, setTemperature] = useState(settings?.ai_temperature || 0);
  const [selectedTemplate, setSelectedTemplate] = useState(settings?.ai_prompt_template || "custom");

  // Custom template dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");

  // Update local state when settings load
  React.useEffect(() => {
    if (settings) {
      setModel(settings.ai_model);
      setInstructions(settings.ai_instructions);
      setTemperature(settings.ai_temperature);
      setSelectedTemplate(settings.ai_prompt_template);
    }
  }, [settings]);

  const handleSave = async () => {
    const success = await saveSettings({
      ai_model: model,
      ai_instructions: instructions,
      ai_temperature: temperature,
      ai_prompt_template: selectedTemplate
    });

    if (success) {
      toast({
        title: "AI settings saved",
        description: "Your agent will use the new configuration for future conversations."
      });
    }
  };

  const handleTemplateChange = async (templateId: string) => {
    if (templateId === "create_new") {
      setIsDialogOpen(true);
      return;
    }

    setSelectedTemplate(templateId);

    if (templateId !== "custom") {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setInstructions(template.instructions);
      }
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a name for your custom template.",
        variant: "destructive"
      });
      return;
    }

    const template = await createTemplate(
      newTemplateName.trim(),
      newTemplateDescription.trim(),
      instructions
    );

    if (template) {
      setSelectedTemplate(template.id);
      setIsDialogOpen(false);
      setNewTemplateName("");
      setNewTemplateDescription("");
    }
  };

  const resetInstructions = () => {
    const defaultInstructions = `### Role
Primary Function: You are an AI chatbot who helps users with their inquiries, issues and requests. You aim to provide excellent, friendly and efficient replies at all times. Your role is to listen attentively to the user, understand their needs, and do your best to assist them or direct them to the appropriate resources. If a question is not clear, ask clarifying questions. Make sure to end your replies with a positive note.`;
    
    setInstructions(defaultInstructions);
    setSelectedTemplate("custom");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading AI settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
          <CardDescription>Configure your agent's AI model, behavior, and response style</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model Selection and Prompt Template - Same Line */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModelSelector value={model} onChange={setModel} />
            <TemplateSelector 
              value={selectedTemplate} 
              templates={templates} 
              onChange={handleTemplateChange} 
            />
          </div>

          <InstructionsEditor 
            value={instructions} 
            onChange={setInstructions} 
            onReset={resetInstructions} 
          />

          <TemperatureSlider value={temperature} onChange={setTemperature} />

          <TrainingStatus settings={settings} />

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <TemplateCreationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        templateName={newTemplateName}
        templateDescription={newTemplateDescription}
        onTemplateNameChange={setNewTemplateName}
        onTemplateDescriptionChange={setNewTemplateDescription}
        onCreateTemplate={handleCreateTemplate}
      />
    </div>
  );
};

export default AISettings;
