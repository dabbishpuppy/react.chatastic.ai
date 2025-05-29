
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileUp } from 'lucide-react';

interface FileUploadAreaProps {
  isDragging: boolean;
  isUploading: boolean;
  supportedTypes: string[];
  maxFileSize: number;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: () => void;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  isDragging,
  isUploading,
  supportedTypes,
  maxFileSize,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect
}) => {
  return (
    <Card
      className={`border border-dashed ${
        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
      } rounded-lg`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4">
          <FileUp size={36} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium mb-2">Drag & drop files here, or click to select files</h3>
        <p className="text-sm text-gray-500 mb-2">Supported File Types: {supportedTypes.join(', ')}</p>
        <p className="text-xs text-gray-400 mb-4">Maximum file size: {maxFileSize}MB</p>
        <Button 
          onClick={onFileSelect} 
          variant="outline"
          disabled={isUploading}
        >
          {isUploading ? 'Processing...' : 'Select Files'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FileUploadArea;
