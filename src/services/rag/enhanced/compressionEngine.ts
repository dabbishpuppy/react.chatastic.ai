
import { supabase } from "@/integrations/supabase/client";
import { compress as zstdCompress, decompress as zstdDecompress } from 'fzstd';

export class CompressionEngine {
  // Actual Zstd compression with configurable levels
  static async compressWithZstd(text: string, level: number = 19): Promise<{
    compressed: Uint8Array;
    originalSize: number;
    compressedSize: number;
    ratio: number;
  }> {
    const originalData = new TextEncoder().encode(text);
    const originalSize = originalData.length;
    
    try {
      console.log(`🗜️ Compressing ${originalSize} bytes with Zstd level ${level}...`);
      
      // Use actual Zstd compression
      const compressed = zstdCompress(originalData, level);
      const compressedSize = compressed.length;
      const ratio = compressedSize / originalSize;
      
      console.log(`✅ Zstd compression: ${originalSize} → ${compressedSize} bytes (${(ratio * 100).toFixed(1)}% ratio)`);
      
      return {
        compressed,
        originalSize,
        compressedSize,
        ratio
      };
    } catch (error) {
      console.error('Zstd compression failed:', error);
      // Fallback to uncompressed data
      return {
        compressed: originalData,
        originalSize,
        compressedSize: originalData.length,
        ratio: 1.0
      };
    }
  }

  static async decompressZstd(compressed: Uint8Array): Promise<string> {
    try {
      console.log(`📦 Decompressing ${compressed.length} bytes with Zstd...`);
      
      // Use actual Zstd decompression
      const decompressed = zstdDecompress(compressed);
      const decompressedText = new TextDecoder().decode(decompressed);
      
      console.log(`✅ Zstd decompression: ${compressed.length} → ${decompressed.length} bytes`);
      
      return decompressedText;
    } catch (error) {
      console.error('Zstd decompression failed:', error);
      // Fallback: assume data is uncompressed
      return new TextDecoder().decode(compressed);
    }
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
    const result = await this.compressWithZstd(text, 19); // Maximum compression
    
    // Convert to base64 for database storage
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
      // Convert from base64
      const compressedBytes = new Uint8Array(
        atob(compressedData).split('').map(char => char.charCodeAt(0))
      );
      
      return await this.decompressZstd(compressedBytes);
    } catch (error) {
      console.error('Failed to decompress from storage:', error);
      // Return as-is if decompression fails
      return compressedData;
    }
  }
}
