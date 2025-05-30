import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { 
  getFileProcessor, 
  getSupportedFileTypes, 
  validateFileType, 
  validateFileSize 
} from '@/utils/fileProcessing';
import { UploadedFile } from './FileUploadProgress';

export const useFileUpload = (refetch: () => void) => {
  const { agentId } = useParams();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { sources } = useRAGServices();

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

      // Calculate content size in bytes
      const contentSize = new Blob([result.content]).size;

      // Create the source in the database
      const newSource = await sources.createSource({
        agent_id: agentId,
        source_type: 'file',
        title: uploadedFile.file.name,
        content: result.content,
        metadata: {
          filename: uploadedFile.file.name,
          original_size: uploadedFile.file.size, // Use original_size instead of fileSize
          file_size: contentSize, // Use file_size instead of content_size
          fileType: uploadedFile.file.type,
          uploadedAt: new Date().toISOString(),
          ...result.metadata
        }
      });

      console.log('✅ New source created:', newSource);

      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'complete', progress: 100 } : f)
      );

      toast({
        title: "File uploaded successfully",
        description: `${uploadedFile.file.name} has been processed and added to your sources`
      });

      // Manually refetch sources to ensure UI updates immediately
      setTimeout(() => {
        refetch();
      }, 500);

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

  }, [agentId, sources, refetch]);

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

  return {
    isDragging,
    uploadedFiles,
    isUploading,
    supportedTypes,
    maxFileSize,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeUploadedFile
  };
};
