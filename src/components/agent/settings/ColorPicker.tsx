
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
  const [hue, setHue] = React.useState(0);
  const [saturation, setSaturation] = React.useState(1);
  const [brightness, setBrightness] = React.useState(1);
  const [isDraggingGradient, setIsDraggingGradient] = React.useState(false);
  const [isDraggingHue, setIsDraggingHue] = React.useState(false);
  
  // Update color when prop changes
  React.useEffect(() => {
    setCurrentColor(color);
    // Convert hex to HSV for internal state
    const rgb = hexToRgb(color);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHue(hsv.h);
    setSaturation(hsv.s);
    setBrightness(hsv.v);
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
        // Update HSV values
        const rgb = hexToRgb(value);
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        setHue(hsv.h);
        setSaturation(hsv.s);
        setBrightness(hsv.v);
      }
    }
  };

  // Handle clicks and dragging on the gradient picker
  const handleGradientInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Calculate relative position (0-1)
    const newSaturation = Math.max(0, Math.min(1, x / rect.width));
    const newBrightness = Math.max(0, Math.min(1, 1 - y / rect.height));
    
    setSaturation(newSaturation);
    setBrightness(newBrightness);
    
    // Convert HSV to RGB and then to hex
    const rgb = hsvToRgb(hue, newSaturation, newBrightness);
    const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
    
    setCurrentColor(hex);
    onChange(hex);
  };

  // Handle hue slider interaction
  const handleHueInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    
    const newHue = Math.max(0, Math.min(360, (x / rect.width) * 360));
    setHue(newHue);
    
    // Convert HSV to RGB and then to hex
    const rgb = hsvToRgb(newHue, saturation, brightness);
    const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
    
    setCurrentColor(hex);
    onChange(hex);
  };

  // Mouse event handlers for dragging
  const handleGradientMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingGradient(true);
    handleGradientInteraction(e);
  };

  const handleHueMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingHue(true);
    handleHueInteraction(e);
  };

  // Global mouse move and up handlers
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingGradient) {
        const gradientElement = document.querySelector('.gradient-picker') as HTMLElement;
        if (gradientElement) {
          const rect = gradientElement.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const newSaturation = Math.max(0, Math.min(1, x / rect.width));
          const newBrightness = Math.max(0, Math.min(1, 1 - y / rect.height));
          
          setSaturation(newSaturation);
          setBrightness(newBrightness);
          
          const rgb = hsvToRgb(hue, newSaturation, newBrightness);
          const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
          
          setCurrentColor(hex);
          onChange(hex);
        }
      }
      
      if (isDraggingHue) {
        const hueElement = document.querySelector('.hue-slider') as HTMLElement;
        if (hueElement) {
          const rect = hueElement.getBoundingClientRect();
          const x = e.clientX - rect.left;
          
          const newHue = Math.max(0, Math.min(360, (x / rect.width) * 360));
          setHue(newHue);
          
          const rgb = hsvToRgb(newHue, saturation, brightness);
          const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
          
          setCurrentColor(hex);
          onChange(hex);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingGradient(false);
      setIsDraggingHue(false);
    };

    if (isDraggingGradient || isDraggingHue) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingGradient, isDraggingHue, hue, saturation, brightness]);

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Convert RGB to HSV
  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    if (diff !== 0) {
      if (max === r) {
        h = ((g - b) / diff) % 6;
      } else if (max === g) {
        h = (b - r) / diff + 2;
      } else {
        h = (r - g) / diff + 4;
      }
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : diff / max;
    const v = max;

    return { h, s, v };
  };

  // Convert HSV to RGB
  const hsvToRgb = (h: number, s: number, v: number) => {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  // Handle predefined color selection
  const handlePresetColorClick = (presetColor: string) => {
    setCurrentColor(presetColor);
    onChange(presetColor);
    // Update HSV values
    const rgb = hexToRgb(presetColor);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHue(hsv.h);
    setSaturation(hsv.s);
    setBrightness(hsv.v);
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
              className="gradient-picker w-full h-32 relative rounded-lg overflow-hidden cursor-crosshair select-none"
              style={{
                backgroundColor: `hsl(${hue}, 100%, 50%)`
              }}
              onMouseDown={handleGradientMouseDown}
            >
              {/* White to transparent gradient (for saturation) */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(to right, #fff, transparent)'
                }}
              />
              {/* Transparent to black gradient (for brightness) */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, #000, transparent)'
                }}
              />
              {/* Draggable dot */}
              <div 
                className="absolute w-3 h-3 border-2 border-white rounded-full pointer-events-none shadow-md"
                style={{
                  left: `${saturation * 100}%`,
                  top: `${(1 - brightness) * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>

            {/* Hue slider */}
            <div 
              className="hue-slider w-full h-4 relative rounded cursor-pointer select-none"
              style={{
                background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
              }}
              onMouseDown={handleHueMouseDown}
            >
              {/* Hue slider handle */}
              <div 
                className="absolute w-3 h-6 border-2 border-white rounded pointer-events-none shadow-md"
                style={{
                  left: `${(hue / 360) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: `hsl(${hue}, 100%, 50%)`
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
                    const hsv = rgbToHsv(r, rgb.g, rgb.b);
                    setHue(hsv.h);
                    setSaturation(hsv.s);
                    setBrightness(hsv.v);
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
                    const hsv = rgbToHsv(rgb.r, g, rgb.b);
                    setHue(hsv.h);
                    setSaturation(hsv.s);
                    setBrightness(hsv.v);
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
                    const hsv = rgbToHsv(rgb.r, rgb.g, b);
                    setHue(hsv.h);
                    setSaturation(hsv.s);
                    setBrightness(hsv.v);
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
