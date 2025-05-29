
import { FileProcessor } from './types';
import { processTextFile } from './processors/textProcessor';
import { processPDFFile } from './processors/pdfProcessor';
import { processDocumentFile } from './processors/documentProcessor';

export * from './types';
export * from './validation';
export { processTextFile } from './processors/textProcessor';
export { processPDFFile } from './processors/pdfProcessor';
export { processDocumentFile } from './processors/documentProcessor';

export const getFileProcessor = (file: File): FileProcessor => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case '.txt':
      return processTextFile;
    case '.pdf':
      return processPDFFile;
    case '.doc':
    case '.docx':
      return processDocumentFile;
    default:
      return processTextFile; // Fallback to text processing
  }
};
