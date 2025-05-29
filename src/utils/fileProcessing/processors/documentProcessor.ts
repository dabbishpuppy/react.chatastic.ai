
import { FileProcessingResult } from '../types';

export const processDocumentFile = async (file: File): Promise<FileProcessingResult> => {
  console.log('🔍 Processing document file:', file.name, 'Type:', file.type);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    console.log('📄 ArrayBuffer size:', arrayBuffer.byteLength);
    
    if (file.name.toLowerCase().endsWith('.docx')) {
      console.log('🔄 Attempting to process DOCX file...');
      
      try {
        console.log('📦 Attempting to import mammoth...');
        const mammothModule = await import('mammoth');
        console.log('✅ Successfully imported mammoth:', mammothModule);
        
        const mammoth = mammothModule.default || mammothModule;
        console.log('🔧 Mammoth object:', mammoth);
        
        if (!mammoth.convertToHtml) {
          throw new Error('mammoth.convertToHtml is not available');
        }
        
        console.log('📖 Converting DOCX to HTML with enhanced options...');
        
        // Enhanced conversion options to preserve more formatting
        const options = {
          // Preserve heading styles
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh", 
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Heading 4'] => h4:fresh",
            "p[style-name='Heading 5'] => h5:fresh",
            "p[style-name='Heading 6'] => h6:fresh",
            "p[style-name='Title'] => h1.title:fresh",
            "p[style-name='Subtitle'] => h2.subtitle:fresh"
          ],
          // Include default styles for formatting
          includeDefaultStyleMap: true,
          // Convert embedded styles
          convertImage: mammoth.images.imgElement(function(image: any) {
            return image.read("base64").then(function(imageBuffer: any) {
              return {
                src: "data:" + image.contentType + ";base64," + imageBuffer
              };
            });
          })
        };
        
        const result = await mammoth.convertToHtml({ arrayBuffer }, options);
        
        console.log('📝 HTML conversion result:', result);
        
        let content = result.value;
        console.log('✅ Successfully extracted HTML content, length:', content.length);
        
        if (!content || content.trim().length === 0) {
          throw new Error('Extracted content is empty');
        }
        
        // Clean up and enhance the HTML for better display
        content = content
          // Ensure proper paragraph spacing
          .replace(/<p><\/p>/g, '<br>')
          // Add proper styling classes for headings
          .replace(/<h1>/g, '<h1 style="font-size: 1.5rem; font-weight: bold; margin: 1rem 0 0.5rem 0;">')
          .replace(/<h2>/g, '<h2 style="font-size: 1.25rem; font-weight: bold; margin: 1rem 0 0.5rem 0;">')
          .replace(/<h3>/g, '<h3 style="font-size: 1.125rem; font-weight: bold; margin: 0.75rem 0 0.375rem 0;">')
          .replace(/<h4>/g, '<h4 style="font-size: 1rem; font-weight: bold; margin: 0.75rem 0 0.375rem 0;">')
          .replace(/<h5>/g, '<h5 style="font-size: 0.875rem; font-weight: bold; margin: 0.5rem 0 0.25rem 0;">')
          .replace(/<h6>/g, '<h6 style="font-size: 0.875rem; font-weight: bold; margin: 0.5rem 0 0.25rem 0;">')
          // Add proper paragraph styling
          .replace(/<p>/g, '<p style="margin: 0.5rem 0; line-height: 1.5;">')
          // Enhance list styling
          .replace(/<ul>/g, '<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">')
          .replace(/<ol>/g, '<ol style="margin: 0.5rem 0; padding-left: 1.5rem;">')
          .replace(/<li>/g, '<li style="margin: 0.25rem 0;">')
          // Ensure strong and em tags are properly styled
          .replace(/<strong>/g, '<strong style="font-weight: bold;">')
          .replace(/<em>/g, '<em style="font-style: italic;">');
        
        // Create a temporary div to get plain text for word count
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        return {
          content,
          metadata: {
            wordCount: plainText.split(/\s+/).filter(word => word.length > 0).length,
            characterCount: plainText.length,
            fileType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            processingMethod: 'mammoth_enhanced_html_extraction',
            isHtml: true
          }
        };
      } catch (mammothError) {
        console.error('❌ Error with mammoth processing:', mammothError);
        console.error('Mammoth error details:', {
          message: mammothError instanceof Error ? mammothError.message : 'Unknown error',
          stack: mammothError instanceof Error ? mammothError.stack : 'No stack trace'
        });
        // Fall through to the general document handling below
      }
    }

    // For .doc files or when mammoth fails, provide a helpful message
    console.log('⚠️ Falling back to placeholder content');
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
    console.error('❌ Error processing document:', error);
    
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
