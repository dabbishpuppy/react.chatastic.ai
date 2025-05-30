
import { toast } from '@/hooks/use-toast';
import { getSupportedFileTypes, validateFileType, validateFileSize } from '@/utils/fileProcessing';

export const useFileValidation = () => {
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

  const validateFiles = (files: FileList): File[] => {
    const validFiles: File[] = [];
    
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
      validFiles.push(file);
    });

    return validFiles;
  };

  return {
    supportedTypes,
    maxFileSize,
    validateFiles
  };
};
