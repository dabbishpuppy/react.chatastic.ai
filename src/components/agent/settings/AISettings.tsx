import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const AISettings: React.FC = () => {
  const [model, setModel] = useState("gpt-4o-mini");
  const [instructions, setInstructions] = useState(
    "### Role\nPrimary Function: You are an AI chatbot who helps users with their inquiries, issues and requests. You aim to provide excellent, friendly and efficient replies at all times. Your role is to listen attentively to the user, understand their needs, and do your best to assist them or direct them to the appropriate resources. If a question is not clear, ask clarifying questions. Make sure to end your replies with a positive note."
  );
  const [temperature, setTemperature] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "AI settings saved",
        description: "Your agent's AI settings have been updated successfully."
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI</CardTitle>
          <CardDescription>Configure your agent's AI settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="model" className="block text-sm font-medium">
              Model
            </label>
            <div className="max-w-md">
              <div className="bg-blue-50 text-blue-800 text-xs px-2.5 py-1 rounded inline-block mb-2">
                Gemini 2.5 flash, o3 and o4-mini models are now available
              </div>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  <SelectItem value="gemini-o3">Gemini o3</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="instructions" className="block text-sm font-medium">
              Instructions
            </label>
            <div className="flex justify-end space-x-2 mb-2">
              <Button variant="outline" size="sm" onClick={() => setInstructions("")}>
                Reset
              </Button>
              <Button variant="outline" size="sm">
                AI agent
              </Button>
            </div>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-sm text-gray-500 mt-2">
              The instructions allow you to customize your agent's personality and style. Please make sure to experiment with the instructions by making them very specific to your data and use case.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="temperature" className="block text-sm font-medium">
              Temperature
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full max-w-md"
              />
              <span>{temperature}</span>
            </div>
            <div className="flex justify-between max-w-md text-sm text-gray-500 mt-1">
              <span>Reserved</span>
              <span>Creative</span>
            </div>
          </div>

          <div className="pt-4">
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Training</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Last trained at</span>
                  </div>
                  <div>March 22, 2025 at 07:32 PM</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AISettings;
