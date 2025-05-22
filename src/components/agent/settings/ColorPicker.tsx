
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
          <input 
            type="color"
            value={currentColor}
            onChange={handleColorChange}
            className="w-32 h-8 cursor-pointer"
          />
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
