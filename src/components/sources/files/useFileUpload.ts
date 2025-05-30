
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { UploadedFile } from './types';
import { useFileValidation } from './fileValidation';
import { useFileProcessor } from './fileProcessor';
import { useDragDropHandlers } from './dragDropHandlers';

export const useFileUpload = (refetch: () => void) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { supportedTypes, maxFileSize, validateFiles } = useFileValidation();
  const { processFile } = useFileProcessor(setUploadedFiles, refetch);
  const { 
    isDragging, 
    handleDragOver, 
    handleDragLeave, 
    handleDrop: handleDropBase 
  } = useDragDropHandlers();

  const handleFiles = useCallback(async (files: FileList) => {
    const validFiles = validateFiles(files);
    if (validFiles.length === 0) return;

    const uploadedFileObjects: UploadedFile[] = validFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...uploadedFileObjects]);
    setIsUploading(true);

    // Process files one by one
    for (const uploadedFile of uploadedFileObjects) {
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

  }, [validateFiles, processFile]);

  const handleDrop = (e: React.DragEvent) => {
    handleDropBase(e, handleFiles);
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
