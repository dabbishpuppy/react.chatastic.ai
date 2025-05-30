
export interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export interface FileUploadConfig {
  maxFileSize: number; // in MB
  supportedTypes: string[];
}
