
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import { UploadedFile } from './types';

interface FileUploadProgressProps {
  uploadedFiles: UploadedFile[];
  onRemoveFile: (id: string) => void;
}

const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  uploadedFiles,
  onRemoveFile
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'complete': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading':
      case 'processing': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'uploading': return 'Uploading';
      case 'processing': return 'Processing';
      case 'complete': return 'Complete';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  if (uploadedFiles.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-medium mb-3">Upload Progress</h3>
        <div className="space-y-3">
          {uploadedFiles.map((uploadedFile) => (
            <div key={uploadedFile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">
                    {uploadedFile.file.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onRemoveFile(uploadedFile.id)}
                  >
                    <X size={14} />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {formatFileSize(uploadedFile.file.size)}
                  </span>
                  <span className={getStatusColor(uploadedFile.status)}>
                    {getStatusText(uploadedFile.status)}
                    {uploadedFile.status === 'uploading' || uploadedFile.status === 'processing' 
                      ? ` (${uploadedFile.progress}%)` : ''}
                  </span>
                </div>
                {uploadedFile.status !== 'pending' && uploadedFile.status !== 'complete' && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadedFile.progress}%` }}
                    />
                  </div>
                )}
                {uploadedFile.error && (
                  <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadProgress;
