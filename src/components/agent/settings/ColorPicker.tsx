
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

  // Handle clicks on the gradient picker
  const handleGradientClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate relative position (0-1)
    const relativeX = Math.max(0, Math.min(1, x / rect.width));
    const relativeY = Math.max(0, Math.min(1, y / rect.height));
    
    // Convert to HSV and then to RGB
    const hue = relativeX * 360;
    const saturation = 1 - relativeY;
    const value = 1;
    
    // HSV to RGB conversion
    const c = value * saturation;
    const x1 = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = value - c;
    
    let r = 0, g = 0, b = 0;
    
    if (hue >= 0 && hue < 60) {
      r = c; g = x1; b = 0;
    } else if (hue >= 60 && hue < 120) {
      r = x1; g = c; b = 0;
    } else if (hue >= 120 && hue < 180) {
      r = 0; g = c; b = x1;
    } else if (hue >= 180 && hue < 240) {
      r = 0; g = x1; b = c;
    } else if (hue >= 240 && hue < 300) {
      r = x1; g = 0; b = c;
    } else if (hue >= 300 && hue < 360) {
      r = c; g = 0; b = x1;
    }
    
    // Convert to 0-255 range and create hex
    const red = Math.round((r + m) * 255);
    const green = Math.round((g + m) * 255);
    const blue = Math.round((b + m) * 255);
    
    const hex = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    
    setCurrentColor(hex);
    onChange(hex);
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
        <PopoverContent className="p-3 w-64" style={{ zIndex: 9999 }}>
          <div className="flex flex-col gap-3">
            {/* Main color picker area */}
            <div 
              className="w-full h-32 relative rounded-lg overflow-hidden cursor-crosshair"
              style={{
                background: `linear-gradient(to right, 
                  hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), 
                  hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), 
                  hsl(360, 100%, 50%)),
                  linear-gradient(to bottom, rgba(255,255,255,0), rgba(0,0,0,1))`
              }}
              onClick={handleGradientClick}
            >
              <div 
                className="absolute w-3 h-3 border-2 border-white rounded-full pointer-events-none shadow-md"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>

            {/* HEX and RGB inputs */}
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
                  onChange={(e) => {
                    const r = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    const newColor = `#${r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
                    setCurrentColor(newColor);
                    onChange(newColor);
                  }}
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
                  onChange={(e) => {
                    const g = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    const newColor = `#${rgb.r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
                    setCurrentColor(newColor);
                    onChange(newColor);
                  }}
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
                  onChange={(e) => {
                    const b = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    const newColor = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    setCurrentColor(newColor);
                    onChange(newColor);
                  }}
                  className="w-full px-1 py-1 text-xs text-center"
                  min="0"
                  max="255"
                />
              </div>
            </div>

            {/* Color swatches */}
            <div className="grid grid-cols-8 gap-1">
              {colorSwatches.map((swatchColor, index) => (
                <button
                  key={index}
                  className="w-5 h-5 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
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
