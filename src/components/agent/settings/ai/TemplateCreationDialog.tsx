
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface TemplateCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  templateDescription: string;
  onTemplateNameChange: (value: string) => void;
  onTemplateDescriptionChange: (value: string) => void;
  onCreateTemplate: () => void;
}

export const TemplateCreationDialog: React.FC<TemplateCreationDialogProps> = ({
  isOpen,
  onClose,
  templateName,
  templateDescription,
  onTemplateNameChange,
  onTemplateDescriptionChange,
  onCreateTemplate
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Custom Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              placeholder="e.g., Marketing Assistant"
            />
          </div>
          <div>
            <Label htmlFor="template-description">Description (Optional)</Label>
            <Input
              id="template-description"
              value={templateDescription}
              onChange={(e) => onTemplateDescriptionChange(e.target.value)}
              placeholder="Brief description of this template"
            />
          </div>
          <p className="text-sm text-gray-500">
            This will save your current instructions as a reusable template.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onCreateTemplate}>
              Create Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
