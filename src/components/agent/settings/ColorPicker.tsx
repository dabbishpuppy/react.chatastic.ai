
import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  
  return (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className={`h-8 w-8 rounded-full border cursor-pointer hover:scale-105 transition-transform ${className}`}
            style={{ backgroundColor: currentColor }}
          />
        </PopoverTrigger>
        <PopoverContent className="p-2 w-auto">
          <div className="flex flex-col gap-2">
            <div className="w-32 h-32 relative">
              <input 
                type="color"
                value={currentColor}
                onChange={handleColorChange}
                className="w-full h-full cursor-pointer absolute top-0 left-0"
              />
            </div>
            <div className="flex justify-between">
              <div>
                <label className="block text-xs mb-1">HEX</label>
                <input 
                  type="text"
                  value={currentColor}
                  onChange={(e) => {
                    if (/^#([0-9A-F]{3}){1,2}$/i.test(e.target.value) || /^#([0-9A-F]{6})$/i.test(e.target.value)) {
                      setCurrentColor(e.target.value);
                      onChange(e.target.value);
                    }
                  }}
                  className="w-20 px-1 py-0.5 border rounded text-sm"
                />
              </div>
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
