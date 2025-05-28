
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// File processing utilities for different file types

export interface FileProcessingResult {
  content: string;
  metadata: {
    wordCount: number;
    characterCount: number;
    fileType: string;
    processingMethod: string;
  };
}

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

export const processDocumentFile = async (file: File): Promise<FileProcessingResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    if (file.name.toLowerCase().endsWith('.docx')) {
      try {
        // Dynamic import of mammoth to handle cases where it might not be available
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ arrayBuffer });
        const content = result.value;
        
        return {
          content,
          metadata: {
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
            characterCount: content.length,
            fileType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            processingMethod: 'mammoth_docx_extraction'
          }
        };
      } catch (mammothError) {
        console.error('Error loading mammoth:', mammothError);
        // Fall through to the general document handling below
      }
    }

    // For .doc files or when mammoth fails, provide a helpful message
    const content = `[Document: ${file.name}]
      
This document format requires text extraction libraries. 
The file has been uploaded successfully, but text content extraction is limited for this format.

File size: ${(file.size / 1024 / 1024).toFixed(2)} MB
File type: ${file.type || 'Unknown'}

For better text extraction, please convert the document to .docx format or upload as a PDF.`;

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: content.length,
        fileType: file.type || 'application/msword',
        processingMethod: 'legacy_doc_limited_support'
      }
    };
  } catch (error) {
    console.error('Error processing document:', error);
    
    // Fallback to placeholder if document processing fails
    const content = `[Document: ${file.name}]
    
Failed to extract text content from this document. This could be due to:
- The document is corrupted or in an unsupported format
- The document contains complex formatting that couldn't be parsed
- The document is password protected

File size: ${(file.size / 1024 / 1024).toFixed(2)} MB
Type: ${file.type || 'Unknown'}
Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`;

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: content.length,
        fileType: file.type || 'application/msword',
        processingMethod: 'document_extraction_failed'
      }
    };
  }
};

export const getFileProcessor = (file: File) => {
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

export const getSupportedFileTypes = () => ['.pdf', '.doc', '.docx', '.txt'];

export const validateFileType = (file: File): boolean => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return getSupportedFileTypes().includes(extension);
};

export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  return file.size <= maxSizeMB * 1024 * 1024;
};
