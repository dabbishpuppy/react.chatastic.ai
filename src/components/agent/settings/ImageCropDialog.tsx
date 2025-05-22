
import React from "react";
import { Button } from "@/components/ui/button";

interface ImageCropDialogProps {
  imageUrl: string;
  title: string;
  onCrop: (file: File) => void;
  onCancel: () => void;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  imageUrl,
  title,
  onCrop,
  onCancel,
}) => {
  const handleAttach = async () => {
    try {
      // In a real implementation, we would apply the cropping logic here
      // For now, we just convert the URL back to a file
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "cropped-image.png", { type: "image/png" });
      onCrop(file);
    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{title}</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <span className="sr-only">Close</span>
            ✕
          </Button>
        </div>
        <div className="bg-gray-900 aspect-square relative rounded-lg overflow-hidden">
          <img 
            src={imageUrl} 
            alt="Preview" 
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 pointer-events-none border-2 border-white rounded-full m-auto w-[90%] h-[90%] flex items-center justify-center">
            <div className="border-[1px] border-white/30 w-full h-full rounded-full"></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Change image
          </Button>
          <Button onClick={handleAttach}>
            Attach image
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropDialog;
