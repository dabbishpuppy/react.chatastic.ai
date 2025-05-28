import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { FileUp, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { useRAGServices } from "@/hooks/useRAGServices";
import { useAgentSources } from "@/hooks/useAgentSources";
import SourcesList from "./SourcesList";
import { 
  getFileProcessor, 
  getSupportedFileTypes, 
  validateFileType, 
  validateFileSize 
} from "@/utils/fileProcessing";

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
}

const FilesTab: React.FC = () => {
  const { agentId } = useParams();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { sources } = useRAGServices();
  const { sources: fileSources, loading, error, removeSourceFromState } = useAgentSources('file');

  const supportedTypes = getSupportedFileTypes();
  const maxFileSize = 10; // MB

  const validateFile = (file: File): string | null => {
    if (!validateFileType(file)) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return `File type ${extension} is not supported. Supported types: ${supportedTypes.join(', ')}`;
    }
    if (!validateFileSize(file, maxFileSize)) {
      return `File size must be less than ${maxFileSize}MB`;
    }
    return null;
  };

  const processFile = async (uploadedFile: UploadedFile) => {
    try {
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'processing', progress: 50 } : f)
      );

      const processor = getFileProcessor(uploadedFile.file);
      const result = await processor(uploadedFile.file);
      
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, progress: 75 } : f)
      );

      if (!agentId) {
        throw new Error('Agent ID is required');
      }

      // Create the source in the database
      await sources.createSource({
        agent_id: agentId,
        source_type: 'file',
        title: uploadedFile.file.name,
        content: result.content,
        metadata: {
          filename: uploadedFile.file.name,
          fileSize: uploadedFile.file.size,
          fileType: uploadedFile.file.type,
          uploadedAt: new Date().toISOString(),
          ...result.metadata
        }
      });

      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'complete', progress: 100 } : f)
      );

      toast({
        title: "File uploaded successfully",
        description: `${uploadedFile.file.name} has been processed and added to your sources`
      });

    } catch (error) {
      console.error('Error processing file:', error);
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { 
          ...f, 
          status: 'error', 
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        } : f)
      );

      toast({
        title: "Upload failed",
        description: `Failed to process ${uploadedFile.file.name}`,
        variant: "destructive"
      });
    }
  };

  const handleFiles = useCallback(async (files: FileList) => {
    if (!agentId) {
      toast({
        title: "Error",
        description: "Agent ID is required",
        variant: "destructive"
      });
      return;
    }

    const validFiles: UploadedFile[] = [];
    
    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Invalid file",
          description: error,
          variant: "destructive"
        });
        return;
      }

      validFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
        progress: 0
      });
    });

    if (validFiles.length === 0) return;

    setUploadedFiles(prev => [...prev, ...validFiles]);
    setIsUploading(true);

    // Process files one by one
    for (const uploadedFile of validFiles) {
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'uploading', progress: 25 } : f)
      );
      
      await processFile(uploadedFile);
    }

    setIsUploading(false);
    
    // Clear completed files after 3 seconds
    setTimeout(() => {
      setUploadedFiles(prev => prev.filter(f => f.status !== 'complete'));
    }, 3000);

  }, [agentId, sources]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = supportedTypes.join(',');
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        handleFiles(target.files);
      }
    };
    input.click();
  };

  const removeUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

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

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">Files</h2>
      </div>

      <Card
        className={`border border-dashed ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        } rounded-lg`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-4">
            <FileUp size={36} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Drag & drop files here, or click to select files</h3>
          <p className="text-sm text-gray-500 mb-2">Supported File Types: {supportedTypes.join(', ')}</p>
          <p className="text-xs text-gray-400 mb-4">Maximum file size: {maxFileSize}MB</p>
          <Button 
            onClick={handleFileSelect} 
            variant="outline"
            disabled={isUploading}
          >
            {isUploading ? 'Processing...' : 'Select Files'}
          </Button>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadedFiles.length > 0 && (
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
                        onClick={() => removeUploadedFile(uploadedFile.id)}
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
      )}

      <SourcesList 
        sources={fileSources} 
        loading={loading} 
        error={error}
        onSourceDeleted={removeSourceFromState}
      />
    </div>
  );
};

export default FilesTab;
