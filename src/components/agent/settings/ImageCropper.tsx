
import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js to always download models
env.allowLocalModels = false;
env.useBrowserCache = false;

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
  const imageRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (isOpen && imageUrl) {
      const img = new Image();
      img.onload = () => {
        if (imageRef.current) {
          imageRef.current = img;
          drawCanvas();
          // Center the crop area
          const size = Math.min(img.width, img.height) * 0.8;
          setCropArea({
            x: (img.width - size) / 2,
            y: (img.height - size) / 2,
            width: size,
            height: size
          });
        }
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
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

    // Draw crop overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 400, 400);

    // Clear crop area
    const cropX = offsetX + (cropArea.x / img.width) * scaledWidth;
    const cropY = offsetY + (cropArea.y / img.height) * scaledHeight;
    const cropW = (cropArea.width / img.width) * scaledWidth;
    const cropH = (cropArea.height / img.height) * scaledHeight;

    ctx.clearRect(cropX, cropY, cropW, cropH);
    ctx.drawImage(img, 
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      cropX, cropY, cropW, cropH
    );

    // Draw crop border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    // Draw resize handles
    const handleSize = 8;
    ctx.fillStyle = '#fff';
    ctx.fillRect(cropX + cropW - handleSize, cropY + cropH - handleSize, handleSize, handleSize);
  };

  useEffect(() => {
    drawCanvas();
  }, [cropArea]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragStart({ x, y });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(prev.x + deltaX, imageRef.current!.width - prev.width)),
      y: Math.max(0, Math.min(prev.y + deltaY, imageRef.current!.height - prev.height))
    }));

    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
    try {
      console.log('Starting background removal process...');
      const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
        device: 'webgpu',
      });
      
      // Convert HTMLImageElement to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Resize image if needed
      const MAX_DIMENSION = 512;
      let width = imageElement.naturalWidth;
      let height = imageElement.naturalHeight;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(imageElement, 0, 0, width, height);
      
      // Get image data as base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Process the image with the segmentation model
      const result = await segmenter(imageData);
      
      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }
      
      // Create a new canvas for the masked image
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      const outputCtx = outputCanvas.getContext('2d');
      
      if (!outputCtx) throw new Error('Could not get output canvas context');
      
      // Draw original image
      outputCtx.drawImage(canvas, 0, 0);
      
      // Apply the mask
      const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const data = outputImageData.data;
      
      // Apply inverted mask to alpha channel
      for (let i = 0; i < result[0].mask.data.length; i++) {
        const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
        data[i * 4 + 3] = alpha;
      }
      
      outputCtx.putImageData(outputImageData, 0, 0);
      
      // Convert canvas to blob
      return new Promise((resolve, reject) => {
        outputCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/png',
          1.0
        );
      });
    } catch (error) {
      console.error('Error removing background:', error);
      throw error;
    }
  };

  const handleCrop = async () => {
    const img = imageRef.current;
    if (!img) return;

    setIsProcessing(true);
    try {
      // Create canvas for cropped image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Set canvas size to crop area
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      // Draw cropped portion
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );

      // Convert to image element for background removal
      const croppedImg = new Image();
      croppedImg.onload = async () => {
        try {
          // Remove background
          const blob = await removeBackground(croppedImg);
          const file = new File([blob], "cropped-image.png", { type: "image/png" });
          onCrop(file);
        } catch (error) {
          console.error("Error processing image:", error);
          // Fallback: just crop without background removal
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], "cropped-image.png", { type: "image/png" });
              onCrop(file);
            }
          }, 'image/png');
        } finally {
          setIsProcessing(false);
        }
      };
      croppedImg.src = canvas.toDataURL();
    } catch (error) {
      console.error("Error cropping image:", error);
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
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
          
          <p className="text-sm text-gray-500">
            Drag to reposition the crop area. The background will be automatically removed.
          </p>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleCrop} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Crop & Remove Background"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropper;
