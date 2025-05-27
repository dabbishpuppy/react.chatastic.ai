
import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ImageCropperProps {
  imageUrl: string;
  title: string;
  onCrop: (file: File) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  imageUrl,
  title,
  onCrop,
  onCancel,
  isOpen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, radius: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load the image when the URL changes or dialog opens
  useEffect(() => {
    if (isOpen && imageUrl) {
      const img = new Image();
      
      img.onload = () => {
        setImageObj(img);
        setImageLoaded(true);
        
        // Center the crop area after the image is loaded
        const minDimension = Math.min(img.width, img.height);
        const radius = minDimension * 0.3;
        setCropArea({
          x: img.width / 2,
          y: img.height / 2,
          radius: radius
        });
      };
      
      img.onerror = () => {
        console.error("Failed to load image");
      };
      
      img.src = imageUrl;
      
      // Clean up function
      return () => {
        img.onload = null;
        img.onerror = null;
      };
    } else {
      setImageLoaded(false);
      setImageObj(null);
    }
  }, [isOpen, imageUrl]);

  // Draw the canvas whenever the image or crop area changes
  useEffect(() => {
    if (imageLoaded && imageObj) {
      drawCanvas();
    }
  }, [cropArea, imageLoaded, imageObj]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageObj;
    
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;

    // Calculate scaling to fit image in canvas
    const scale = Math.min(400 / img.width, 400 / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const offsetX = (400 - scaledWidth) / 2;
    const offsetY = (400 - scaledHeight) / 2;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 400, 400);

    // Draw image
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

    // Draw crop overlay (darken everything)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 400, 400);

    // Calculate circle position on canvas
    const centerX = offsetX + (cropArea.x / img.width) * scaledWidth;
    const centerY = offsetY + (cropArea.y / img.height) * scaledHeight;
    const radiusOnCanvas = (cropArea.radius / img.width) * scaledWidth;

    // Clear circular crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusOnCanvas, 0, 2 * Math.PI);
    ctx.fill();

    // Reset composite operation and draw the image again in the circle
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusOnCanvas, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
    ctx.restore();

    // Draw circle border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusOnCanvas, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw resize handle
    const handleSize = 8;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    const handleX = centerX + radiusOnCanvas - handleSize / 2;
    const handleY = centerY;
    ctx.fillRect(handleX - handleSize / 2, handleY - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(handleX - handleSize / 2, handleY - handleSize / 2, handleSize, handleSize);
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const canvasToImageCoords = (canvasX: number, canvasY: number) => {
    if (!imageObj) return { x: 0, y: 0 };

    const scale = Math.min(400 / imageObj.width, 400 / imageObj.height);
    const scaledWidth = imageObj.width * scale;
    const scaledHeight = imageObj.height * scale;
    const offsetX = (400 - scaledWidth) / 2;
    const offsetY = (400 - scaledHeight) / 2;

    return {
      x: ((canvasX - offsetX) / scaledWidth) * imageObj.width,
      y: ((canvasY - offsetY) / scaledHeight) * imageObj.height
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageObj) return;

    const mousePos = getMousePos(e);
    const scale = Math.min(400 / imageObj.width, 400 / imageObj.height);
    const offsetX = (400 - (imageObj.width * scale)) / 2;
    const offsetY = (400 - (imageObj.height * scale)) / 2;
    
    const centerX = offsetX + (cropArea.x / imageObj.width) * (imageObj.width * scale);
    const centerY = offsetY + (cropArea.y / imageObj.height) * (imageObj.height * scale);
    const radiusOnCanvas = (cropArea.radius / imageObj.width) * (imageObj.width * scale);

    // Check if clicking on resize handle
    const handleX = centerX + radiusOnCanvas;
    const handleY = centerY;
    const handleDistance = Math.sqrt(Math.pow(mousePos.x - handleX, 2) + Math.pow(mousePos.y - handleY, 2));

    if (handleDistance <= 12) {
      setIsResizing(true);
    } else {
      // Check if clicking inside the circle for dragging
      const distanceFromCenter = Math.sqrt(Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2));
      if (distanceFromCenter <= radiusOnCanvas) {
        setIsDragging(true);
      }
    }

    setDragStart(mousePos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imageObj || (!isDragging && !isResizing)) return;

    const mousePos = getMousePos(e);

    if (isResizing) {
      // Calculate new radius based on distance from center
      const scale = Math.min(400 / imageObj.width, 400 / imageObj.height);
      const offsetX = (400 - (imageObj.width * scale)) / 2;
      const offsetY = (400 - (imageObj.height * scale)) / 2;
      const centerX = offsetX + (cropArea.x / imageObj.width) * (imageObj.width * scale);
      const centerY = offsetY + (cropArea.y / imageObj.height) * (imageObj.height * scale);
      
      const newRadiusOnCanvas = Math.sqrt(Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2));
      const newRadius = (newRadiusOnCanvas / (imageObj.width * scale)) * imageObj.width;
      
      // Limit radius to image boundaries
      const maxRadius = Math.min(
        cropArea.x,
        cropArea.y,
        imageObj.width - cropArea.x,
        imageObj.height - cropArea.y
      );
      
      setCropArea(prev => ({
        ...prev,
        radius: Math.max(20, Math.min(newRadius, maxRadius))
      }));
    } else if (isDragging) {
      // Move the crop area
      const deltaX = mousePos.x - dragStart.x;
      const deltaY = mousePos.y - dragStart.y;
      const imageCoordsDelta = canvasToImageCoords(deltaX, deltaY);
      const imageCoordsDeltaX = imageCoordsDelta.x - canvasToImageCoords(0, 0).x;
      const imageCoordsDeltaY = imageCoordsDelta.y - canvasToImageCoords(0, 0).y;

      setCropArea(prev => ({
        ...prev,
        x: Math.max(prev.radius, Math.min(prev.x + imageCoordsDeltaX, imageObj.width - prev.radius)),
        y: Math.max(prev.radius, Math.min(prev.y + imageCoordsDeltaY, imageObj.height - prev.radius))
      }));

      setDragStart(mousePos);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleCrop = async () => {
    if (!imageObj) return;

    setIsProcessing(true);
    try {
      // Create canvas for cropped image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Set canvas size to diameter of crop circle
      const diameter = cropArea.radius * 2;
      canvas.width = diameter;
      canvas.height = diameter;

      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(cropArea.radius, cropArea.radius, cropArea.radius, 0, 2 * Math.PI);
      ctx.clip();

      // Draw the cropped portion
      ctx.drawImage(
        imageObj,
        cropArea.x - cropArea.radius, cropArea.y - cropArea.radius, diameter, diameter,
        0, 0, diameter, diameter
      );

      // Convert to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "cropped-image.png", { type: "image/png" });
          onCrop(file);
        }
      }, 'image/png');
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Drag to reposition the crop area. Drag the handle to resize the circle.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleCrop} disabled={isProcessing || !imageLoaded}>
              {isProcessing ? "Processing..." : "Crop & Attach Image"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropper;
