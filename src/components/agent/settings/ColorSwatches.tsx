
import React from "react";

interface ColorSwatchesProps {
  onColorSelect: (color: string) => void;
}

const ColorSwatches: React.FC<ColorSwatchesProps> = ({ onColorSelect }) => {
  const colorSwatches = [
    '#DC2626', '#EA580C', '#FACC15', '#A16207', '#65A30D', 
    '#16A34A', '#9333EA', '#A855F7', '#1D4ED8', '#0D9488',
    '#84CC16', '#000000', '#374151', '#9CA3AF', '#FFFFFF'
  ];

  return (
    <div className="grid grid-cols-8 gap-1">
      {colorSwatches.map((swatchColor, index) => (
        <button
          key={index}
          className="w-5 h-5 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
          style={{ backgroundColor: swatchColor }}
          onClick={() => onColorSelect(swatchColor)}
        />
      ))}
    </div>
  );
};

export default ColorSwatches;
