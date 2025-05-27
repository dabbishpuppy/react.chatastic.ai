
import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import GradientPicker from "./GradientPicker";
import HueSlider from "./HueSlider";
import ColorInputs from "./ColorInputs";
import ColorSwatches from "./ColorSwatches";
import { hexToRgb, rgbToHsv, hsvToRgb, rgbToHex } from "./colorUtils";

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
  
  // Update color when prop changes
  React.useEffect(() => {
    setCurrentColor(color);
    const rgb = hexToRgb(color);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHue(hsv.h);
    setSaturation(hsv.s);
    setBrightness(hsv.v);
  }, [color]);

  // Handle saturation and brightness changes from gradient picker
  const handleSaturationBrightnessChange = (newSaturation: number, newBrightness: number) => {
    setSaturation(newSaturation);
    setBrightness(newBrightness);
    
    const rgb = hsvToRgb(hue, newSaturation, newBrightness);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    
    setCurrentColor(hex);
    onChange(hex);
  };

  // Handle hue changes from hue slider
  const handleHueChange = (newHue: number) => {
    setHue(newHue);
    
    const rgb = hsvToRgb(newHue, saturation, brightness);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    
    setCurrentColor(hex);
    onChange(hex);
  };

  // Handle color changes from inputs
  const handleColorChange = (newColor: string) => {
    setCurrentColor(newColor);
    onChange(newColor);
  };

  // Handle HSV changes from inputs
  const handleHSVChange = (h: number, s: number, v: number) => {
    setHue(h);
    setSaturation(s);
    setBrightness(v);
  };

  // Handle preset color selection
  const handlePresetColorSelect = (presetColor: string) => {
    setCurrentColor(presetColor);
    onChange(presetColor);
    const rgb = hexToRgb(presetColor);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHue(hsv.h);
    setSaturation(hsv.s);
    setBrightness(hsv.v);
  };
  
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
            <GradientPicker
              hue={hue}
              saturation={saturation}
              brightness={brightness}
              onSaturationBrightnessChange={handleSaturationBrightnessChange}
            />

            {/* Hue slider */}
            <HueSlider
              hue={hue}
              onHueChange={handleHueChange}
            />

            {/* HEX and RGB inputs */}
            <ColorInputs
              currentColor={currentColor}
              onColorChange={handleColorChange}
              onHSVChange={handleHSVChange}
            />

            {/* Color swatches */}
            <ColorSwatches onColorSelect={handlePresetColorSelect} />
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
