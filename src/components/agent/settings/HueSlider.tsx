
import React from "react";

interface HueSliderProps {
  hue: number;
  onHueChange: (hue: number) => void;
}

const HueSlider: React.FC<HueSliderProps> = ({ hue, onHueChange }) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    
    const newHue = Math.max(0, Math.min(360, (x / rect.width) * 360));
    onHueChange(newHue);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleInteraction(e);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const hueElement = document.querySelector('.hue-slider') as HTMLElement;
        if (hueElement) {
          const rect = hueElement.getBoundingClientRect();
          const x = e.clientX - rect.left;
          
          const newHue = Math.max(0, Math.min(360, (x / rect.width) * 360));
          onHueChange(newHue);
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
  }, [isDragging, onHueChange]);

  return (
    <div 
      className="hue-slider w-full h-4 relative rounded cursor-pointer select-none"
      style={{
        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
      }}
      onMouseDown={handleMouseDown}
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
  );
};

export default HueSlider;
