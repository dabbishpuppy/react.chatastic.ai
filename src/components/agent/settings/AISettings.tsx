import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { useAISettings } from "@/hooks/useAISettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Clock, CheckCircle, AlertTriangle, Calendar, Info } from "lucide-react";

const AI_MODELS = [
  { 
    value: "gpt-4o-mini", 
    label: "GPT-4o Mini", 
    provider: "OpenAI",
    logo: "/lovable-uploads/b8a1cad7-3471-42d5-bf69-9d09231a0a32.png",
    cost: "Very Low",
    description: "A fast, cost-effective model perfect for most conversational tasks. Offers excellent performance for general chat applications while being highly efficient.",
    capabilities: ["Text generation", "Conversation", "Code assistance", "Analysis"],
    speed: "Very Fast"
  },
  { 
    value: "gpt-4o", 
    label: "GPT-4o", 
    provider: "OpenAI",
    logo: "/lovable-uploads/b8a1cad7-3471-42d5-bf69-9d09231a0a32.png",
    cost: "Medium",
    description: "Our most advanced model with superior reasoning capabilities. Perfect for complex tasks requiring deep understanding and nuanced responses.",
    capabilities: ["Advanced reasoning", "Complex analysis", "Creative writing", "Code generation"],
    speed: "Fast"
  },
  { 
    value: "gpt-4-turbo", 
    label: "GPT-4 Turbo", 
    provider: "OpenAI",
    logo: "/lovable-uploads/b8a1cad7-3471-42d5-bf69-9d09231a0a32.png",
    cost: "High",
    description: "An optimized version of GPT-4, generating text faster and more efficiently. Ideal for tasks needing advanced GPT-4 capabilities with enhanced speed.",
    capabilities: ["Advanced reasoning", "Large context", "Multimodal", "Code generation"],
    speed: "Medium"
  },
  { 
    value: "claude-3-haiku", 
    label: "Claude 3 Haiku", 
    provider: "Anthropic",
    logo: "/lovable-uploads/3bf5853d-b8f1-4ab5-a42a-f41b6d66476d.png",
    cost: "Low",
    description: "Anthropic's fastest model, designed for rapid responses while maintaining high quality. Great for customer service and quick interactions.",
    capabilities: ["Fast responses", "Helpful assistant", "Safety focused", "Conversational"],
    speed: "Very Fast"
  },
  { 
    value: "claude-3-sonnet", 
    label: "Claude 3 Sonnet", 
    provider: "Anthropic",
    logo: "/lovable-uploads/3bf5853d-b8f1-4ab5-a42a-f41b6d66476d.png",
    cost: "Medium",
    description: "Balanced performance and capability model. Excellent for most business applications requiring reliable, thoughtful responses.",
    capabilities: ["Balanced reasoning", "Creative tasks", "Analysis", "Safety focused"],
    speed: "Fast"
  },
  { 
    value: "claude-3-opus", 
    label: "Claude 3 Opus", 
    provider: "Anthropic",
    logo: "/lovable-uploads/3bf5853d-b8f1-4ab5-a42a-f41b6d66476d.png",
    cost: "High",
    description: "Anthropic's most powerful model with exceptional reasoning and creative capabilities. Best for complex tasks requiring deep analysis.",
    capabilities: ["Superior reasoning", "Complex analysis", "Creative writing", "Advanced tasks"],
    speed: "Medium"
  },
  { 
    value: "gemini-1.5-flash", 
    label: "Gemini 1.5 Flash", 
    provider: "Google",
    logo: "/lovable-uploads/32094ea1-3b6a-4168-9818-027ea7db3eb2.png",
    cost: "Low",
    description: "Google's optimized model for speed and efficiency. Perfect for applications requiring quick responses with good quality.",
    capabilities: ["Fast processing", "Multimodal", "Code generation", "Analysis"],
    speed: "Very Fast"
  },
  { 
    value: "gemini-1.5-pro", 
    label: "Gemini 1.5 Pro", 
    provider: "Google",
    logo: "/lovable-uploads/32094ea1-3b6a-4168-9818-027ea7db3eb2.png",
    cost: "Medium",
    description: "Google's advanced model with enhanced reasoning and multimodal capabilities. Excellent for complex conversational applications.",
    capabilities: ["Advanced reasoning", "Multimodal", "Large context", "Complex tasks"],
    speed: "Fast"
  }
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
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Configuration</CardTitle>
            <CardDescription>Configure your agent's AI model, behavior, and response style</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Model Selection and Prompt Template - Same Line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AI Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model" className="block text-sm font-medium">
                  AI Model
                </Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an AI model" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {AI_MODELS.map((modelOption) => (
                      <Tooltip key={modelOption.value} delayDuration={300}>
                        <TooltipTrigger asChild>
                          <SelectItem value={modelOption.value} className="cursor-pointer">
                            <div className="flex items-center space-x-2">
                              <img 
                                src={modelOption.logo} 
                                alt={`${modelOption.provider} logo`}
                                className="w-5 h-5 object-contain flex-shrink-0"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{modelOption.label}</span>
                                <span className="text-xs text-gray-500">{modelOption.provider}</span>
                              </div>
                              <Info className="h-3 w-3 text-gray-400 ml-auto" />
                            </div>
                          </SelectItem>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="w-80 p-4 bg-white border shadow-lg">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <img 
                                src={modelOption.logo} 
                                alt={`${modelOption.provider} logo`}
                                className="w-8 h-8 object-contain"
                              />
                              <div>
                                <h4 className="font-semibold text-gray-900">{modelOption.label}</h4>
                                <p className="text-sm text-gray-600">{modelOption.provider}</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{modelOption.description}</p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">Cost:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  modelOption.cost === 'Very Low' || modelOption.cost === 'Low' ? 'bg-green-100 text-green-700' :
                                  modelOption.cost === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {modelOption.cost}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">Speed:</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  modelOption.speed === 'Very Fast' ? 'bg-green-100 text-green-700' :
                                  modelOption.speed === 'Fast' ? 'bg-blue-100 text-blue-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {modelOption.speed}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Capabilities:</p>
                              <div className="flex flex-wrap gap-1">
                                {modelOption.capabilities.map((capability, index) => (
                                  <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                                    {capability}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prompt Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template" className="block text-sm font-medium">
                  Prompt Template
                </Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-full">
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

            {/* Enhanced Training Status */}
            <div className="pt-4">
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-blue-900">Training Status</CardTitle>
                      <CardDescription className="text-blue-700">
                        Monitor your agent's training progress and last update
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-blue-100">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Last Training Session</div>
                        <div className="text-gray-600">
                          {settings?.last_trained_at 
                            ? new Date(settings.last_trained_at).toLocaleString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : "No training sessions yet"
                          }
                        </div>
                      </div>
                      <div className="flex items-center">
                        {settings?.last_trained_at ? (
                          <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
                            <CheckCircle className="h-3 w-3" />
                            <span>Trained</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-xs">
                            <Clock className="h-3 w-3" />
                            <span>Pending</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <strong>Auto-training:</strong> Training is automatically triggered when you save significant changes to AI settings. This ensures your agent uses the latest configuration.
                      </div>
                    </div>
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
    </TooltipProvider>
  );
};

export default AISettings;
