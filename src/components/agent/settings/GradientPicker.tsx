
import React from "react";

interface GradientPickerProps {
  hue: number;
  saturation: number;
  brightness: number;
  onSaturationBrightnessChange: (saturation: number, brightness: number) => void;
}

const GradientPicker: React.FC<GradientPickerProps> = ({
  hue,
  saturation,
  brightness,
  onSaturationBrightnessChange
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const newSaturation = Math.max(0, Math.min(1, x / rect.width));
    const newBrightness = Math.max(0, Math.min(1, 1 - y / rect.height));
    
    onSaturationBrightnessChange(newSaturation, newBrightness);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleInteraction(e);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const gradientElement = document.querySelector('.gradient-picker') as HTMLElement;
        if (gradientElement) {
          const rect = gradientElement.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const newSaturation = Math.max(0, Math.min(1, x / rect.width));
          const newBrightness = Math.max(0, Math.min(1, 1 - y / rect.height));
          
          onSaturationBrightnessChange(newSaturation, newBrightness);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, onSaturationBrightnessChange]);

  return (
    <div 
      className="gradient-picker w-full h-32 relative rounded-lg overflow-hidden cursor-crosshair select-none"
      style={{
        backgroundColor: `hsl(${hue}, 100%, 50%)`
      }}
      onMouseDown={handleMouseDown}
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
  );
};

export default GradientPicker;
