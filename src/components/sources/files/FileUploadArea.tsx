
import React, { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploadAreaProps {
  isDragging: boolean;
  isUploading: boolean;
  supportedTypes: string[];
  maxFileSize: number;
  onFileSelect: () => void; // This will be the handleFileSelect from the hook
  onUploadComplete: (results: any[]) => void;
  onError: (error: string) => void;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  isDragging,
  isUploading,
  supportedTypes,
  maxFileSize,
  onFileSelect,
  onUploadComplete,
  onError
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">Uploading files...</p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Upload Files</h3>
                  <p className="text-sm text-gray-500">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    Supported: {supportedTypes.join(', ')} (max {formatFileSize(maxFileSize)})
                  </p>
                </div>
                <button
                  onClick={onFileSelect}
                  className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Choose Files
                </button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadArea;
