
import { supabase } from "@/integrations/supabase/client";

export class ContentExtractionService {
  // Extract and clean content from HTML using readability-like algorithm
  static async extractContent(htmlContent: string, url: string): Promise<{
    title: string;
    content: string;
    length: number;
  }> {
    console.log('🔍 Extracting content from HTML...');
    
    // Remove script, style, and navigation elements
    const cleanedHtml = htmlContent
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<nav[^>]*>.*?<\/nav>/gi, '')
      .replace(/<header[^>]*>.*?<\/header>/gi, '')
      .replace(/<footer[^>]*>.*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>.*?<\/aside>/gi, '');

    // Extract title
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    // Convert to plain text and clean up
    const textContent = cleanedHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`✅ Extracted ${textContent.length} characters from ${url}`);

    return {
      title,
      content: textContent,
      length: textContent.length
    };
  }

  // Enhanced compression using database encryption functions
  static async compressText(text: string): Promise<{
    compressed: Uint8Array;
    originalSize: number;
    compressedSize: number;
    ratio: number;
  }> {
    console.log('🗜️ Compressing extracted text...');
    
    const originalSize = new TextEncoder().encode(text).length;
    
    try {
      // Use the new database encryption function for compression
      const { data: compressedBase64, error } = await supabase
        .rpc('encrypt_sensitive_data', { 
          data: text,
          key_id: 'content-compression' 
        });

      if (error) {
        console.error('Compression error, falling back to base64:', error);
        // Fallback to simple encoding
        const encoded = new TextEncoder().encode(text);
        return {
          compressed: encoded,
          originalSize,
          compressedSize: encoded.length,
          ratio: encoded.length / originalSize
        };
      }

      const compressedBytes = new TextEncoder().encode(compressedBase64);
      const compressionRatio = compressedBytes.length / originalSize;

      console.log(`✅ Compressed from ${originalSize} to ${compressedBytes.length} bytes (${(compressionRatio * 100).toFixed(1)}%)`);

      return {
        compressed: compressedBytes,
        originalSize,
        compressedSize: compressedBytes.length,
        ratio: compressionRatio
      };
    } catch (error) {
      console.error('Compression failed, using fallback:', error);
      const encoded = new TextEncoder().encode(text);
      return {
        compressed: encoded,
        originalSize,
        compressedSize: encoded.length,
        ratio: 1.0
      };
    }
  }

  // Generate content summary using simple extraction
  static async generateContentSummary(content: string): Promise<{
    summary: string;
    keywords: string[];
  }> {
    console.log('📝 Generating content summary...');
    
    // Extract first few meaningful sentences for summary
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20)
      .slice(0, 3);
    
    const summary = sentences.join('. ').substring(0, 200) + '...';

    // Extract keywords by frequency analysis
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'would', 'could', 'should'].includes(word));

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const keywords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    console.log(`✅ Generated summary (${summary.length} chars) and ${keywords.length} keywords`);

    return { summary, keywords };
  }

  // Clean content for optimal chunking
  static cleanContentForChunking(content: string): string {
    console.log('🧹 Cleaning content for chunking...');
    
    return content
      // Remove advertisements and promotional content
      .replace(/\b(Advertisement|Sponsored|Ad|Promo)\b/gi, '')
      .replace(/\b(Click here|Read more|Learn more|Subscribe|Sign up)\b/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive punctuation
      .replace(/[.]{3,}/g, '...')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      .trim();
  }

  // Decompress archived content when needed
  static async decompressText(compressedData: string): Promise<string> {
    try {
      const { data: decompressedText, error } = await supabase
        .rpc('decrypt_sensitive_data', { 
          encrypted_data: compressedData,
          key_id: 'content-compression' 
        });

      if (error) {
        console.error('Decompression error:', error);
        return compressedData; // Return as-is if decompression fails
      }

      return decompressedText;
    } catch (error) {
      console.error('Failed to decompress:', error);
      return compressedData;
    }
  }
}
