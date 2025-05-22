
import React from 'react';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  currentImage?: string;
  onUpload: (file: File) => Promise<string>;
  onRemove: () => void;
  shape?: 'circle' | 'square';
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  currentImage, 
  onUpload, 
  onRemove, 
  shape = 'circle',
  size = 'md',
  placeholder,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Size classes based on the size prop
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };
  
  // Shape classes based on the shape prop
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
      
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="flex items-center space-x-4">
      <div className={`${sizeClasses[size]} ${shapeClass} overflow-hidden bg-gray-100 border flex items-center justify-center`}>
        {currentImage ? (
          <img 
            src={currentImage} 
            alt="Uploaded"
            className="h-full w-full object-cover"
          />
        ) : placeholder ? (
          <span className="text-2xl">{placeholder}</span>
        ) : null}
      </div>
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          type="button" 
          onClick={handleUploadClick}
          size="sm"
        >
          Upload
        </Button>
        
        {currentImage && (
          <Button 
            variant="outline" 
            type="button" 
            onClick={onRemove}
            size="sm"
          >
            Remove
          </Button>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg, image/png, image/svg+xml"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ImageUpload;
