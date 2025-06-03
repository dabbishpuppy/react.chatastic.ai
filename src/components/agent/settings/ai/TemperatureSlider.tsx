
import React from "react";
import { Label } from "@/components/ui/label";

interface TemperatureSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export const TemperatureSlider: React.FC<TemperatureSliderProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="temperature" className="block text-sm font-medium">
        Temperature: {value}
      </Label>
      <div className="flex items-center space-x-4">
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="flex justify-between w-full text-sm text-gray-500 mt-1">
        <span>Focused</span>
        <span>Balanced</span>
        <span>Creative</span>
      </div>
    </div>
  );
};
