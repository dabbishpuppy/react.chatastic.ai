
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { useAISettings } from "@/hooks/useAISettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";

const AI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "OpenAI" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku", provider: "Anthropic" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet", provider: "Anthropic" },
  { value: "claude-3-opus", label: "Claude 3 Opus", provider: "Anthropic" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "Google" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "Google" }
];

const AISettings: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { settings, templates, isLoading, isSaving, saveSettings, createTemplate, applyTemplate } = useAISettings(agentId!);
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
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model" className="block text-sm font-medium">
              AI Model
            </Label>
            <div className="max-w-md">
              <div className="bg-blue-50 text-blue-800 text-xs px-2.5 py-1 rounded inline-block mb-2">
                Configure API keys in Functions settings to enable all models
              </div>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an AI model" />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((modelOption) => (
                    <SelectItem key={modelOption.value} value={modelOption.value}>
                      <div className="flex flex-col">
                        <span>{modelOption.label}</span>
                        <span className="text-xs text-gray-500">{modelOption.provider}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prompt Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template" className="block text-sm font-medium">
              Prompt Template
            </Label>
            <div className="flex gap-2 max-w-md">
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Prompt</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-gray-500">{template.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="create_new">
                    <div className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Template
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions" className="block text-sm font-medium">
              Instructions
            </Label>
            <div className="flex justify-end space-x-2 mb-2">
              <Button variant="outline" size="sm" onClick={resetInstructions}>
                Reset
              </Button>
            </div>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              placeholder="Enter your agent's instructions..."
            />
            <p className="text-sm text-gray-500 mt-2">
              The instructions define your agent's personality, knowledge, and response style. Be specific about your use case for best results.
            </p>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <Label htmlFor="temperature" className="block text-sm font-medium">
              Temperature: {temperature}
            </Label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full max-w-md"
              />
            </div>
            <div className="flex justify-between max-w-md text-sm text-gray-500 mt-1">
              <span>Focused</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Training Status */}
          <div className="pt-4">
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Training Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Last trained at:</span>
                  </div>
                  <div className="text-gray-700">
                    {settings?.last_trained_at 
                      ? new Date(settings.last_trained_at).toLocaleString()
                      : "Never trained"
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Training is automatically triggered when you save significant changes to AI settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

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

      {/* Custom Template Creation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Marketing Assistant"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Input
                id="template-description"
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="Brief description of this template"
              />
            </div>
            <p className="text-sm text-gray-500">
              This will save your current instructions as a reusable template.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AISettings;
