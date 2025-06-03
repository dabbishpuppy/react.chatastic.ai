
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface InstructionsEditorProps {
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
}

export const InstructionsEditor: React.FC<InstructionsEditorProps> = ({ value, onChange, onReset }) => {
  return (
    <div>
      <Label htmlFor="instructions" className="block text-sm font-medium">
        Instructions
      </Label>
      <div className="flex justify-end space-x-2 mt-2 mb-2">
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
      <Textarea
        id="instructions"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        className="font-mono text-sm"
        placeholder="Enter your agent's instructions..."
      />
      <p className="text-sm text-gray-500 mt-2">
        The instructions define your agent's personality, knowledge, and response style. Be specific about your use case for best results.
      </p>
    </div>
  );
};
