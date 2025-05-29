
import { FileProcessingResult } from '../types';

export const processTextFile = async (file: File): Promise<FileProcessingResult> => {
  const content = await file.text();
  
  return {
    content,
    metadata: {
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: content.length,
      fileType: 'text/plain',
      processingMethod: 'direct_text_read'
    }
  };
};
