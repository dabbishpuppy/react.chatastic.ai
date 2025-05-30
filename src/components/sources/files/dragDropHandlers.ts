
import { useState } from 'react';

export const useDragDropHandlers = () => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, onFilesSelected: (files: FileList) => void) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};
