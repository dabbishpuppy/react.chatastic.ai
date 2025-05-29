
import * as pdfjsLib from 'pdfjs-dist';
import { FileProcessingResult } from '../types';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const processPDFFile = async (file: File): Promise<FileProcessingResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return {
      content: fullText.trim(),
      metadata: {
        wordCount: fullText.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: fullText.length,
        fileType: 'application/pdf',
        processingMethod: 'pdfjs_extraction'
      }
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    
    // Fallback to placeholder if PDF processing fails
    const content = `[PDF Document: ${file.name}]
    
Failed to extract text content from this PDF. This could be due to:
- The PDF contains scanned images without OCR text
- The PDF is password protected
- The PDF has complex formatting that couldn't be parsed

File size: ${(file.size / 1024 / 1024).toFixed(2)} MB
Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`;

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: content.length,
        fileType: 'application/pdf',
        processingMethod: 'pdf_extraction_failed'
      }
    };
  }
};
