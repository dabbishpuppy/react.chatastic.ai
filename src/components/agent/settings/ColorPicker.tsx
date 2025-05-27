
import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onReset?: () => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onReset, className }) => {
  const [currentColor, setCurrentColor] = React.useState(color);
  
  // Update color when prop changes
  React.useEffect(() => {
    setCurrentColor(color);
  }, [color]);
  
  // Handle color input changes
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCurrentColor(newColor);
    onChange(newColor);
  };

  // Handle HEX input changes
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Add # if not present
    if (value && !value.startsWith('#')) {
      value = '#' + value;
    }
    
    // Validate hex format
    if (/^#([0-9A-Fa-f]{0,6})$/.test(value)) {
      setCurrentColor(value);
      if (value.length === 7) {
        onChange(value);
      }
    }
  };

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Handle predefined color selection
  const handlePresetColorClick = (presetColor: string) => {
    setCurrentColor(presetColor);
    onChange(presetColor);
  };

  const rgb = hexToRgb(currentColor);

  // Predefined color swatches
  const colorSwatches = [
    '#DC2626', '#EA580C', '#FACC15', '#A16207', '#65A30D', 
    '#16A34A', '#9333EA', '#A855F7', '#1D4ED8', '#0D9488',
    '#84CC16', '#000000', '#374151', '#9CA3AF', '#FFFFFF'
  ];
  
  return (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className={`h-8 w-8 rounded-full border cursor-pointer hover:scale-105 transition-transform ${className}`}
            style={{ backgroundColor: currentColor }}
          />
        </PopoverTrigger>
        <PopoverContent className="p-4 w-80" style={{ zIndex: 9999 }}>
          <div className="flex flex-col gap-4">
            {/* Main color picker area */}
            <div className="w-full h-48 relative bg-gradient-to-r from-white to-red-500 rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black"></div>
              <input 
                type="color"
                value={currentColor}
                onChange={handleColorChange}
                className="w-full h-full opacity-0 cursor-crosshair absolute top-0 left-0"
              />
              <div 
                className="absolute w-3 h-3 border-2 border-white rounded-full pointer-events-none"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>

            {/* HEX and RGB inputs */}
            <div className="grid grid-cols-5 gap-2 text-center">
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
                  onChange={(e) => {
                    const r = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    const newColor = `#${r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
                    setCurrentColor(newColor);
                    onChange(newColor);
                  }}
                  className="w-full px-2 py-1 text-xs text-center"
                  min="0"
                  max="255"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">G</label>
                <Input 
                  type="number"
                  value={rgb.g}
                  onChange={(e) => {
                    const g = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    const newColor = `#${rgb.r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
                    setCurrentColor(newColor);
                    onChange(newColor);
                  }}
                  className="w-full px-2 py-1 text-xs text-center"
                  min="0"
                  max="255"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">B</label>
                <Input 
                  type="number"
                  value={rgb.b}
                  onChange={(e) => {
                    const b = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    const newColor = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    setCurrentColor(newColor);
                    onChange(newColor);
                  }}
                  className="w-full px-2 py-1 text-xs text-center"
                  min="0"
                  max="255"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">A</label>
                <Input 
                  type="number"
                  value="100"
                  readOnly
                  className="w-full px-2 py-1 text-xs text-center bg-gray-100"
                />
              </div>
            </div>

            {/* Color swatches */}
            <div className="grid grid-cols-8 gap-1">
              {colorSwatches.map((swatchColor, index) => (
                <button
                  key={index}
                  className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: swatchColor }}
                  onClick={() => handlePresetColorClick(swatchColor)}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {onReset && (
        <Button 
          variant="outline"
          size="sm" 
          onClick={onReset}
        >
          Reset
        </Button>
      )}
    </div>
  );
};

export default ColorPicker;
