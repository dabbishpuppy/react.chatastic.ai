
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { PromptTemplate } from "@/hooks/useAISettings";

interface TemplateSelectorProps {
  value: string;
  templates: PromptTemplate[];
  onChange: (value: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ value, templates, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="template" className="block text-sm font-medium">
        Prompt Template
      </Label>
      <Select value={value} onValueChange={onChange}>
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
  );
};
