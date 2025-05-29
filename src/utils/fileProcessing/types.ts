
export interface FileProcessingResult {
  content: string;
  metadata: {
    wordCount: number;
    characterCount: number;
    fileType: string;
    processingMethod: string;
    isHtml?: boolean;
  };
}

export type FileProcessor = (file: File) => Promise<FileProcessingResult>;
