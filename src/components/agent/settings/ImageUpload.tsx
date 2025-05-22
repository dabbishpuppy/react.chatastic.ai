
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { UploadCloud, X } from "lucide-react";

interface ImageUploadProps {
  currentImage?: string | null;
  onUpload: (file: File) => Promise<string | null>;
  onRemove: () => void;
  aspectRatio?: number;
  shape?: "square" | "rounded" | "circle";
  className?: string;
  placeholder?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  onUpload,
  onRemove,
  aspectRatio = 1,
  shape = "circle",
  className = "",
  placeholder = "👋",
  size = "md",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shapeClasses = {
    square: "rounded",
    rounded: "rounded-lg",
    circle: "rounded-full",
  };

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (1MB limit)
    if (file.size > 1024 * 1024) {
      alert("File size exceeds 1MB limit");
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      alert("Only JPG, PNG, and SVG files are supported");
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div
        className={`border overflow-hidden bg-gray-100 ${sizeClasses[size]} ${shapeClasses[shape]} ${className}`}
      >
        <AspectRatio ratio={aspectRatio}>
          {currentImage ? (
            <img
              src={currentImage}
              alt="Uploaded image"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-2xl">
              {placeholder}
            </div>
          )}
        </AspectRatio>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1"
        >
          <UploadCloud className="h-4 w-4" />
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
        {currentImage && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="text-gray-500 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Remove
          </Button>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/jpeg,image/png,image/svg+xml"
        />
      </div>
    </div>
  );
};

export default ImageUpload;
