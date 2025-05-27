
import React from "react";
import { Input } from "@/components/ui/input";
import { RGB, hexToRgb, rgbToHex, rgbToHsv } from "./colorUtils";

interface ColorInputsProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  onHSVChange: (h: number, s: number, v: number) => void;
}

const ColorInputs: React.FC<ColorInputsProps> = ({
  currentColor,
  onColorChange,
  onHSVChange
}) => {
  const rgb = hexToRgb(currentColor);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    if (value && !value.startsWith('#')) {
      value = '#' + value;
    }
    
    if (/^#([0-9A-Fa-f]{0,6})$/.test(value)) {
      onColorChange(value);
      if (value.length === 7) {
        const rgb = hexToRgb(value);
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        onHSVChange(hsv.h, hsv.s, hsv.v);
      }
    }
  };

  const handleRGBChange = (component: 'r' | 'g' | 'b', value: string) => {
    const numValue = Math.min(255, Math.max(0, parseInt(value) || 0));
    const newRGB = { ...rgb, [component]: numValue };
    const newColor = rgbToHex(newRGB.r, newRGB.g, newRGB.b);
    
    onColorChange(newColor);
    const hsv = rgbToHsv(newRGB.r, newRGB.g, newRGB.b);
    onHSVChange(hsv.h, hsv.s, hsv.v);
  };

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div>
        <label className="block text-xs font-medium mb-1">Hex</label>
        <Input 
          type="text"
          value={currentColor}
          onChange={handleHexChange}
          className="w-full px-2 py-1 text-xs text-center"
          maxLength={7}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">R</label>
        <Input 
          type="number"
          value={rgb.r}
          onChange={(e) => handleRGBChange('r', e.target.value)}
          className="w-full px-1 py-1 text-xs text-center"
          min="0"
          max="255"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">G</label>
        <Input 
          type="number"
          value={rgb.g}
          onChange={(e) => handleRGBChange('g', e.target.value)}
          className="w-full px-1 py-1 text-xs text-center"
          min="0"
          max="255"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">B</label>
        <Input 
          type="number"
          value={rgb.b}
          onChange={(e) => handleRGBChange('b', e.target.value)}
          className="w-full px-1 py-1 text-xs text-center"
          min="0"
          max="255"
        />
      </div>
    </div>
  );
};

export default ColorInputs;
