import { supabase } from "@/integrations/supabase/client";

export class CompressionEngine {
  // Enhanced compression with fallback to simple compression
  static async compressWithZstd(text: string, level: number = 19): Promise<{
    compressed: Uint8Array;
    originalSize: number;
    compressedSize: number;
    ratio: number;
  }> {
    const originalData = new TextEncoder().encode(text);
    const originalSize = originalData.length;
    
    try {
      console.log(`🗜️ Attempting compression of ${originalSize} bytes...`);
      
      // Try using fzstd for compression
      try {
        const fzstd = await import('fzstd');
        
        // Since fzstd might not have compress, we'll use browser's built-in compression
        console.log('📦 Using built-in compression as fzstd compress is not available');
        
        // Use CompressionStream if available (modern browsers)
        if ('CompressionStream' in window) {
          const compressed = await this.compressWithCompressionStream(originalData);
          const compressedSize = compressed.length;
          const ratio = compressedSize / originalSize;
          
          console.log(`✅ Compression: ${originalSize} → ${compressedSize} bytes (${(ratio * 100).toFixed(1)}% ratio)`);
          
          return {
            compressed,
            originalSize,
            compressedSize,
            ratio
          };
        }
      } catch (fzstdError) {
        console.warn('fzstd compression failed:', fzstdError);
      }
      
      // Fallback to simple text compression using gzip-like approach
      const compressed = await this.simpleCompress(originalData);
      const compressedSize = compressed.length;
      const ratio = compressedSize / originalSize;
      
      console.log(`✅ Fallback compression: ${originalSize} → ${compressedSize} bytes (${(ratio * 100).toFixed(1)}% ratio)`);
      
      return {
        compressed,
        originalSize,
        compressedSize,
        ratio
      };
      
    } catch (error) {
      console.error('All compression methods failed:', error);
      // Return uncompressed data
      return {
        compressed: originalData,
        originalSize,
        compressedSize: originalData.length,
        ratio: 1.0
      };
    }
  }

  // Use browser's CompressionStream if available
  private static async compressWithCompressionStream(data: Uint8Array): Promise<Uint8Array> {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(data);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  // Simple compression fallback
  private static async simpleCompress(data: Uint8Array): Promise<Uint8Array> {
    // Simple run-length encoding for basic compression
    const compressed: number[] = [];
    let i = 0;
    
    while (i < data.length) {
      const current = data[i];
      let count = 1;
      
      // Count consecutive identical bytes
      while (i + count < data.length && data[i + count] === current && count < 255) {
        count++;
      }
      
      if (count > 3) {
        // Use run-length encoding for runs of 4 or more
        compressed.push(255, count, current); // 255 is escape byte
      } else {
        // Store bytes directly
        for (let j = 0; j < count; j++) {
          compressed.push(current);
        }
      }
      
      i += count;
    }
    
    return new Uint8Array(compressed);
  }

  static async decompressZstd(compressed: Uint8Array): Promise<string> {
    try {
      console.log(`📦 Attempting decompression of ${compressed.length} bytes...`);
      
      // Try fzstd decompression first
      try {
        const { decompress } = await import('fzstd');
        const decompressed = decompress(compressed);
        const decompressedText = new TextDecoder().decode(decompressed);
        
        console.log(`✅ fzstd decompression: ${compressed.length} → ${decompressed.length} bytes`);
        return decompressedText;
      } catch (fzstdError) {
        console.warn('fzstd decompression failed, trying alternatives:', fzstdError);
      }
      
      // Try DecompressionStream if available
      if ('DecompressionStream' in window) {
        try {
          const decompressed = await this.decompressWithDecompressionStream(compressed);
          const decompressedText = new TextDecoder().decode(decompressed);
          
          console.log(`✅ Browser decompression: ${compressed.length} → ${decompressed.length} bytes`);
          return decompressedText;
        } catch (streamError) {
          console.warn('Browser decompression failed:', streamError);
        }
      }
      
      // Try simple decompression
      const decompressed = this.simpleDecompress(compressed);
      const decompressedText = new TextDecoder().decode(decompressed);
      
      console.log(`✅ Simple decompression: ${compressed.length} → ${decompressed.length} bytes`);
      return decompressedText;
      
    } catch (error) {
      console.error('All decompression methods failed:', error);
      // Fallback: assume data is uncompressed
      return new TextDecoder().decode(compressed);
    }
  }

  // Use browser's DecompressionStream if available
  private static async decompressWithDecompressionStream(data: Uint8Array): Promise<Uint8Array> {
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(data);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  // Simple decompression fallback
  private static simpleDecompress(data: Uint8Array): Uint8Array {
    const decompressed: number[] = [];
    let i = 0;
    
    while (i < data.length) {
      if (data[i] === 255 && i + 2 < data.length) {
        // Run-length encoded sequence
        const count = data[i + 1];
        const value = data[i + 2];
        
        for (let j = 0; j < count; j++) {
          decompressed.push(value);
        }
        
        i += 3;
      } else {
        // Direct byte
        decompressed.push(data[i]);
        i++;
      }
    }
    
    return new Uint8Array(decompressed);
  }

  // Enhanced content cleaning for better compression ratios
  static cleanContentForCompression(htmlContent: string): string {
    return htmlContent
      // Remove all scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove navigation and boilerplate
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      // Remove ads and promotional content
      .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*id="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      // Remove common CTA patterns
      .replace(/\b(click here|read more|subscribe now|sign up|learn more|get started)\b/gi, '')
      // Remove social media widgets
      .replace(/<div[^>]*class="[^"]*social[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Convert to plain text
      .replace(/<[^>]+>/g, ' ')
      // Normalize whitespace for better compression
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Generate stable content hash for deduplication
  static async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Compress text for storage with optimal settings
  static async compressForStorage(text: string): Promise<{
    compressedData: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  }> {
    const result = await this.compressWithZstd(text, 19);
    
    const compressedData = btoa(String.fromCharCode(...result.compressed));
    
    return {
      compressedData,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      compressionRatio: result.ratio
    };
  }

  // Decompress text from storage
  static async decompressFromStorage(compressedData: string): Promise<string> {
    try {
      const compressedBytes = new Uint8Array(
        atob(compressedData).split('').map(char => char.charCodeAt(0))
      );
      
      return await this.decompressZstd(compressedBytes);
    } catch (error) {
      console.error('Failed to decompress from storage:', error);
      return compressedData;
    }
  }
}
